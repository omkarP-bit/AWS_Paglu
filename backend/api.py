from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import schemas, models, matching
import json
from datetime import datetime
import asyncio

router = APIRouter()

manager = None

def set_ws_manager(ws_manager):
    global manager
    manager = ws_manager

async def notify_clients(action: str, data: dict):
    if manager:
        await manager.broadcast(json.dumps({"action": action, "data": data}))

@router.post("/donors", response_model=schemas.DonorResponse)
async def create_donor(donor: schemas.DonorCreate, db: Session = Depends(get_db)):
    # Create Donor
    db_donor = models.Donor(name=donor.name, blood_group=donor.blood_group, hospital_id=donor.hospital_id)
    db.add(db_donor)
    db.flush() # get id
    
    # Create Organ
    db_organ = models.Organ(donor_id=db_donor.id, organ_type=donor.organ_type)
    db.add(db_organ)
    db.flush()
    
    # Run Matching Engine inline (Transaction open)
    # matching engine handles making the allocation if found
    match_result = matching.run_matching_engine(db, db_organ, db_donor)
    
    db.commit()
    db.refresh(db_donor)
    
    # Send WebSocket event
    if match_result.get('match'):
        await notify_clients("NEW_ALLOCATION", match_result)
    else:
        await notify_clients("NEW_DONOR", {"id": str(db_donor.id)})
        
    return db_donor

@router.post("/recipients", response_model=schemas.RecipientResponse)
async def create_recipient(recipient: schemas.RecipientCreate, db: Session = Depends(get_db)):
    # Check if there's already an available organ?
    # For simplicity, we just add the recipient to waiting list. 
    # In a full system, you'd try to match incoming recipients against available organs.
    
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
    
    # Since we committed, we notify
    await notify_clients("NEW_RECIPIENT", {"id": str(db_recipient.id)})
    
    return db_recipient

@router.get("/dashboard-data", response_model=schemas.DashboardData)
def get_dashboard_data(db: Session = Depends(get_db)):
    donors = db.query(models.Donor).order_by(models.Donor.created_at.desc()).limit(50).all()
    recipients = db.query(models.Recipient).order_by(models.Recipient.created_at.desc()).limit(50).all()
    allocations = db.query(models.Allocation).order_by(models.Allocation.allocation_time.desc()).limit(50).all()
    
    return {
        "donors": donors,
        "recipients": recipients,
        "allocations": allocations
    }
