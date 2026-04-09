from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
import json
import logging
from models import Donor, Organ, Recipient, WaitingList, Allocation, Notification, AuditLog, BloodCompatibility

logger = logging.getLogger(__name__)

def run_matching_engine(db: Session, organ: Organ, donor: Donor):
    """
    Finds the best recipient for the given organ using row-level locking.
    If a match is found, creates an allocation and updates status.
    Must be called within an active transaction.
    """
    try:
        # Find compatible blood groups
        compatible_blood_groups = db.query(BloodCompatibility.recipient_group).filter(
            BloodCompatibility.donor_group == donor.blood_group
        ).all()
        
        comp_blood_groups = [r[0] for r in compatible_blood_groups]
        
        # 1. Fetch matching recipients with row lock
        # Matching criteria:
        # - same organ needed
        # - compatible blood group
        # - active on waiting list
        # We lock the waiting_list and recipients to prevent concurrent allocations
        
        # Order by urgency (DESC) and waiting_since (ASC)
        waiting_entry = db.query(WaitingList).join(Recipient).filter(
            WaitingList.organ_needed == organ.organ_type,
            WaitingList.blood_group.in_(comp_blood_groups),
            WaitingList.is_active == True,
            Recipient.status == 'waiting'
        ).order_by(
            desc(WaitingList.urgency_score),
            asc(WaitingList.waiting_since)
        ).with_for_update(skip_locked=True).first()
        
        if waiting_entry:
            recipient = waiting_entry.recipient
            
            # Match Found!
            allocation = Allocation(
                organ_id=organ.id,
                recipient_id=recipient.id,
                match_score=json.dumps({
                    "urgency_score_matched": recipient.urgency_score,
                    "blood_compatibility": f"{donor.blood_group} -> {recipient.blood_group}",
                    "organ_type": organ.organ_type
                })
            )
            db.add(allocation)
            
            # Update statuses
            organ.status = 'allocated'
            recipient.status = 'allocated'
            waiting_entry.is_active = False
            
            # Notification
            notification = Notification(
                recipient_id=recipient.id,
                donor_id=donor.id,
                organ_id=organ.id,
                message=f"Match Found! {organ.organ_type.capitalize()} allocated to {recipient.name}."
            )
            db.add(notification)
            
            # Audit log
            audit_log = AuditLog(
                entity_type="allocation",
                entity_id=allocation.id,
                action="allocated",
                metadata_=json.dumps({"recipient_id": str(recipient.id), "organ_id": str(organ.id)})
            )
            db.add(audit_log)
            
            # Return true to indicate a match was made
            return dict(organ_id=str(organ.id), recipient_id=str(recipient.id), match=True)

        return dict(match=False)
    except Exception as e:
        logger.error(f"Error in matching engine: {e}")
        db.rollback()
        raise e
