import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    location = Column(String)
    created_at = Column(DateTime, server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String(50), nullable=False)
    reference_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, server_default=func.now())

class Donor(Base):
    __tablename__ = "donors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    blood_group = Column(String(3), nullable=False)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey('hospitals.id'))
    age = Column(Integer)
    contact_number = Column(String(20))
    consent_given = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    status = Column(String(20), default="active")

    organs = relationship("Organ", back_populates="donor", cascade="all, delete-orphan")
    hospital = relationship("Hospital")

class Organ(Base):
    __tablename__ = "organs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey('donors.id', ondelete='CASCADE'))
    organ_type = Column(String(20), nullable=False)
    status = Column(String(20), default="available")
    created_at = Column(DateTime, server_default=func.now())

    donor = relationship("Donor", back_populates="organs")

class Recipient(Base):
    __tablename__ = "recipients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    blood_group = Column(String(3), nullable=False)
    organ_needed = Column(String(20), nullable=False)
    urgency_score = Column(Integer, nullable=False)
    waiting_since = Column(DateTime, nullable=False)
    status = Column(String(20), default="waiting")
    created_at = Column(DateTime, server_default=func.now())
    
    # New Fields
    age = Column(Integer)
    contact_number = Column(String(20))
    medical_report_url = Column(String)
    doctor_notes = Column(String)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey('hospitals.id'))

    waiting_entry = relationship("WaitingList", back_populates="recipient", uselist=False, cascade="all, delete-orphan")
    hospital = relationship("Hospital")

class WaitingList(Base):
    __tablename__ = "waiting_list"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey('recipients.id', ondelete='CASCADE'), unique=True)
    organ_needed = Column(String(20), nullable=False)
    blood_group = Column(String(3), nullable=False)
    urgency_score = Column(Integer, nullable=False)
    waiting_since = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    recipient = relationship("Recipient", back_populates="waiting_entry")

class Allocation(Base):
    __tablename__ = "allocations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organ_id = Column(UUID(as_uuid=True), ForeignKey('organs.id'), unique=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey('recipients.id'), unique=True)
    allocation_time = Column(DateTime, server_default=func.now())
    status = Column(String(20), default="confirmed")
    match_score = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True))
    donor_id = Column(UUID(as_uuid=True))
    organ_id = Column(UUID(as_uuid=True))
    message = Column(String)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    action = Column(String(50))
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime, server_default=func.now())

class BloodCompatibility(Base):
    __tablename__ = "blood_compatibility"
    donor_group = Column(String(3), primary_key=True)
    recipient_group = Column(String(3), primary_key=True)
