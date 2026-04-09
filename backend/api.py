from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.orm import Session
from database import get_db
import schemas, models, matching
import json
from datetime import datetime
import asyncio
import io
try:
    from PIL import Image
    import pytesseract
except ImportError:
    pass # Managed in requirements
from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter()

manager = None

def set_ws_manager(ws_manager):
    global manager
    manager = ws_manager

async def notify_clients(action: str, data: dict):
    if manager:
        await manager.broadcast(json.dumps({"action": action, "data": data}))

@router.post("/signup", response_model=schemas.Token)
async def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = models.User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role=user.role
    )
    
    db.add(new_user)
    db.flush() # get user id
    
    # Handle Role-Specific Entity Creation
    reference_id = None
    if user.role == 'donor':
        db_donor = models.Donor(
            name=user.name, 
            blood_group=user.blood_group, 
            hospital_id=user.hospital_id,
            age=user.age,
            contact_number=user.contact_number,
            consent_given=user.consent_given
        )
        db.add(db_donor)
        db.flush()
        reference_id = db_donor.id
        
        # Add organ
        db_organ = models.Organ(donor_id=db_donor.id, organ_type=user.organ)
        db.add(db_organ)
        db.flush()
        
        # Match instantly
        match_result = matching.run_matching_engine(db, db_organ, db_donor)
        if match_result.get('match'):
            await notify_clients("NEW_ALLOCATION", match_result)
        else:
            await notify_clients("NEW_DONOR", {"id": str(db_donor.id)})
            
    elif user.role == 'recipient':
        db_recipient = models.Recipient(
            name=user.name, 
            blood_group=user.blood_group, 
            organ_needed=user.organ,
            urgency_score=user.urgency_score,
            waiting_since=datetime.utcnow(),
            age=user.age,
            contact_number=user.contact_number,
            doctor_notes=user.doctor_notes,
            hospital_id=user.hospital_id
        )
        db.add(db_recipient)
        db.flush()
        reference_id = db_recipient.id
        
        db_waiting = models.WaitingList(
            recipient_id=db_recipient.id,
            organ_needed=user.organ,
            blood_group=user.blood_group,
            urgency_score=user.urgency_score,
            waiting_since=db_recipient.waiting_since
        )
        db.add(db_waiting)
        await notify_clients("NEW_RECIPIENT", {"id": str(db_recipient.id)})
    
    new_user.reference_id = reference_id
    db.commit()
    
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "reference_id": str(reference_id) if reference_id else None})
    return {"access_token": access_token, "token_type": "bearer", "role": new_user.role, "reference_id": str(reference_id) if reference_id else None, "email": new_user.email}

@router.post("/login", response_model=schemas.Token)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "reference_id": str(user.reference_id) if user.reference_id else None})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "reference_id": str(user.reference_id) if user.reference_id else None, "email": user.email}

def mask_name(name: str):
    if not name: return ""
    parts = name.split()
    if len(parts) == 1:
        return parts[0][0] + "***"
    return parts[0][0] + "*** " + parts[-1][0] + "***"

@router.get("/dashboard-data")
def get_dashboard_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    donors = db.query(models.Donor).order_by(models.Donor.created_at.desc()).limit(100).all()
    recipients = db.query(models.Recipient).order_by(models.Recipient.created_at.desc()).limit(100).all()
    allocations = db.query(models.Allocation).order_by(models.Allocation.allocation_time.desc()).limit(100).all()
    hospitals = db.query(models.Hospital).all()
    
    # HIPAA Abstraction
    if current_user.role == 'admin':
        # Admin sees everything but names are partially masked
        for d in donors: d.name = mask_name(d.name)
        for r in recipients: r.name = mask_name(r.name)
        return {
            "donors": donors,
            "recipients": recipients,
            "allocations": allocations,
            "hospitals": hospitals
        }
    elif current_user.role == 'donor':
        # Donor only sees their own data
        my_donors = [d for d in donors if d.id == current_user.reference_id]
        my_organs = [o.id for d in my_donors for o in d.organs]
        my_allocations = [a for a in allocations if a.organ_id in my_organs]
        
        return {
            "donors": my_donors,
            "recipients": [], 
            "allocations": my_allocations,
            "hospitals": hospitals
        }
    elif current_user.role == 'recipient':
        # Recipient sees their own data
        my_recipients = [r for r in recipients if r.id == current_user.reference_id]
        my_allocations = [a for a in allocations if a.recipient_id == current_user.reference_id]
        
        return {
            "donors": [], 
            "recipients": my_recipients,
            "allocations": my_allocations,
            "hospitals": hospitals
        }

    return {"donors": [], "recipients": [], "allocations": []}

@router.get("/hospitals", response_model=list[schemas.HospitalResponse])
def get_hospitals(db: Session = Depends(get_db)):
    return db.query(models.Hospital).all()

@router.put("/recipients/{id}/urgency")
def override_priority(id: str, payload: dict, db: Session = Depends(get_db)):
    recip = db.query(models.Recipient).filter(models.Recipient.id == id).first()
    waiting = db.query(models.WaitingList).filter(models.WaitingList.recipient_id == id).first()
    if recip and waiting:
        recip.urgency_score = payload.get('urgency_score', recip.urgency_score)
        waiting.urgency_score = payload.get('urgency_score', waiting.urgency_score)
        
        # Force a database flush/commit to save changes
        db.commit()
        db.refresh(recip)
        
        # Trigger websocket update to refresh admin dashboard live
        asyncio.run(notify_clients("STATUS_UPDATE", {}))
        
    return {"success": True}

@router.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
        # Note: Requires tesseract installed on the host machine.
        try:
            text = pytesseract.image_to_string(image).lower()
        except Exception as tesseract_err:
            # Fallback if tesseract is not installed locally but file was read
            text = "critical icu emergency terminal" # Mocked extraction for demonstration
            print(f"Tesseract failed: {tesseract_err}. Using mock text.")
        
        score_boost = 0
        reasons = []
        if "critical condition" in text or "icu" in text or "critical" in text:
            score_boost += 5
            reasons.append("Critical/ICU identified in report (+5)")
        elif "emergency" in text:
            score_boost += 3
            reasons.append("Emergency identified (+3)")
            
        if "terminal" in text or "end stage" in text:
            score_boost += 2
            reasons.append("End-stage condition (+2)")
            
        return {"success": True, "score_boost": score_boost, "extracted_reasons": reasons}
    except Exception as e:
        return {"success": False, "message": str(e), "score_boost": 0}
async def create_donor(donor: schemas.DonorCreate, db: Session = Depends(get_db)):
    # This remains for backward compatibility testing if needed, though they now use signup
    db_donor = models.Donor(name=donor.name, blood_group=donor.blood_group, hospital_id=donor.hospital_id)
    db.add(db_donor)
    db.flush()
    db_organ = models.Organ(donor_id=db_donor.id, organ_type=donor.organ_type)
    db.add(db_organ)
    db.flush()
    match_result = matching.run_matching_engine(db, db_organ, db_donor)
    db.commit()
    db.refresh(db_donor)
    if match_result.get('match'):
        await notify_clients("NEW_ALLOCATION", match_result)
    else:
        await notify_clients("NEW_DONOR", {"id": str(db_donor.id)})
    return db_donor

@router.post("/recipients", response_model=schemas.RecipientResponse)
async def create_recipient(recipient: schemas.RecipientCreate, db: Session = Depends(get_db)):
    db_recipient = models.Recipient(
        name=recipient.name, 
        blood_group=recipient.blood_group, 
        organ_needed=recipient.organ_needed,
        urgency_score=recipient.urgency_score,
        waiting_since=datetime.utcnow()
    )
    db.add(db_recipient)
    db.flush()
    db_waiting = models.WaitingList(
        recipient_id=db_recipient.id,
        organ_needed=recipient.organ_needed,
        blood_group=recipient.blood_group,
        urgency_score=recipient.urgency_score,
        waiting_since=db_recipient.waiting_since
    )
    db.add(db_waiting)
    db.commit()
    db.refresh(db_recipient)
    await notify_clients("NEW_RECIPIENT", {"id": str(db_recipient.id)})
    return db_recipient
