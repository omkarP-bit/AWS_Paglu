from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import schemas, models, matching
import json
from datetime import datetime
import asyncio
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
        db_donor = models.Donor(name=user.name, blood_group=user.blood_group, hospital_id=user.hospital_id)
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
            waiting_since=datetime.utcnow()
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
    donors = db.query(models.Donor).order_by(models.Donor.created_at.desc()).limit(50).all()
    recipients = db.query(models.Recipient).order_by(models.Recipient.created_at.desc()).limit(50).all()
    allocations = db.query(models.Allocation).order_by(models.Allocation.allocation_time.desc()).limit(50).all()
    
    # HIPAA Abstraction
    if current_user.role == 'admin':
        # Admin sees everything but names are partially masked
        for d in donors: d.name = mask_name(d.name)
        for r in recipients: r.name = mask_name(r.name)
        return {
            "donors": donors,
            "recipients": recipients,
            "allocations": allocations
        }
    elif current_user.role == 'donor':
        # Donor only sees their own data
        my_donors = [d for d in donors if d.id == current_user.reference_id]
        my_organs = [o.id for d in my_donors for o in d.organs]
        my_allocations = [a for a in allocations if a.organ_id in my_organs]
        
        return {
            "donors": my_donors,
            "recipients": [], # Cannot see any recipients
            "allocations": my_allocations
        }
    elif current_user.role == 'recipient':
        # Recipient sees their own data
        my_recipients = [r for r in recipients if r.id == current_user.reference_id]
        my_allocations = [a for a in allocations if a.recipient_id == current_user.reference_id]
        
        return {
            "donors": [], # Cannot see donors
            "recipients": my_recipients,
            "allocations": my_allocations
        }

    return {"donors": [], "recipients": [], "allocations": []}

@router.post("/donors", response_model=schemas.DonorResponse)
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
