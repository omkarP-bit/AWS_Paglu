from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    email: str
    password: str
    role: str # admin, donor, recipient
    name: Optional[str] = None
    blood_group: Optional[str] = None
    organ: Optional[str] = None # organ_type or organ_needed
    hospital_id: Optional[str] = None # For donor
    urgency_score: Optional[int] = None # For recipient

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    reference_id: Optional[str] = None
    email: str

class LoginRequest(BaseModel):
    email: str
    password: str

class DonorCreate(BaseModel):
    name: str
    blood_group: str
    hospital_id: str
    organ_type: str  # Creating donor and organ together

class RecipientCreate(BaseModel):
    name: str
    blood_group: str
    organ_needed: str
    urgency_score: int

class OrganResponse(BaseModel):
    id: uuid.UUID
    organ_type: str
    status: str

    class Config:
        from_attributes = True

class DonorResponse(BaseModel):
    id: uuid.UUID
    name: str
    blood_group: str
    status: str
    organs: List[OrganResponse] = []

    class Config:
        from_attributes = True
        
class RecipientResponse(BaseModel):
    id: uuid.UUID
    name: str
    blood_group: str
    organ_needed: str
    urgency_score: int
    waiting_since: datetime
    status: str

    class Config:
        from_attributes = True

class AllocationResponse(BaseModel):
    id: uuid.UUID
    organ_id: uuid.UUID
    recipient_id: uuid.UUID
    status: str
    allocation_time: datetime

    class Config:
        from_attributes = True
        
class DashboardData(BaseModel):
    donors: List[DonorResponse]
    recipients: List[RecipientResponse]
    allocations: List[AllocationResponse]
