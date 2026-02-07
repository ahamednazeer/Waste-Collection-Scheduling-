"""
WorkerAssignment model for schedule-worker assignments
"""
from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABSENT = "ABSENT"
    REASSIGNED = "REASSIGNED"


class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, index=True)
    
    # Assignment details
    assigned_role = Column(String, default="COLLECTOR")  # Role for this assignment
    
    # Status tracking
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ASSIGNED)
    
    # Time tracking
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    hours_worked = Column(Float, default=0.0)
    
    # Performance
    waste_collected_kg = Column(Float, default=0.0)
    performance_rating = Column(Float, nullable=True)  # 1-5
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    worker = relationship("Worker", back_populates="assignments")
    schedule = relationship("Schedule", back_populates="worker_assignments")
    
    def __repr__(self):
        return f"<WorkerAssignment Worker:{self.worker_id} Schedule:{self.schedule_id}>"
