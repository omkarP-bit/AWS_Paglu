from database import SessionLocal
from models import Hospital
import uuid

def seed_hospitals():
    db = SessionLocal()
    hospitals = [
        {"name": "City General Hospital", "location": "Downtown"},
        {"name": "St. Jude Medical Center", "location": "Westside"},
        {"name": "Mercy Care Hospital", "location": "North Hills"}
    ]
    
    if db.query(Hospital).count() == 0:
        for h in hospitals:
            db.add(Hospital(id=uuid.uuid4(), name=h["name"], location=h["location"]))
        db.commit()
        print("Hospitals seeded successfully.")
    else:
        print("Hospitals already exist.")
    db.close()

if __name__ == "__main__":
    seed_hospitals()
