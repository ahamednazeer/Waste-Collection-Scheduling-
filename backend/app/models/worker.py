"""
Worker model for workforce management
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class WorkerRole(str, enum.Enum):
    DRIVER = "DRIVER"
    COLLECTOR = "COLLECTOR"
    SUPERVISOR = "SUPERVISOR"


class SkillLevel(str, enum.Enum):
    JUNIOR = "JUNIOR"
    INTERMEDIATE = "INTERMEDIATE"
    SENIOR = "SENIOR"
    EXPERT = "EXPERT"


class WorkerStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_DUTY = "ON_DUTY"
    ON_LEAVE = "ON_LEAVE"
    INACTIVE = "INACTIVE"


class Worker(Base):
    __tablename__ = "workers"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    
    # Contact
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    
    # Role and skills
    role = Column(Enum(WorkerRole), default=WorkerRole.COLLECTOR)
    skill_level = Column(Enum(SkillLevel), default=SkillLevel.INTERMEDIATE)
    certifications = Column(JSON, nullable=True)  # List of certifications
    
    # Status and availability
    status = Column(Enum(WorkerStatus), default=WorkerStatus.AVAILABLE)
    is_active = Column(Boolean, default=True)
    
    # Availability schedule (JSON: {day: {start: "HH:MM", end: "HH:MM"}})
    availability_schedule = Column(JSON, nullable=True)
    
    # Workload tracking
    weekly_hours_limit = Column(Float, default=40.0)
    current_week_hours = Column(Float, default=0.0)
    total_assignments = Column(Integer, default=0)

    # Self-service PIN (hashed)
    pin_hash = Column(String(255), nullable=True)
    
    # Performance metrics
    avg_performance_rating = Column(Float, default=0.0)
    total_waste_collected_kg = Column(Float, default=0.0)
    
    # Metadata
    hire_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    assignments = relationship("WorkerAssignment", back_populates="worker")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<Worker {self.employee_id}: {self.full_name} ({self.role})>"
