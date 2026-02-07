"""
Schedule model for collection scheduling
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Time, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class ScheduleStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DELAYED = "DELAYED"


class TimeWindow(str, enum.Enum):
    EARLY_MORNING = "EARLY_MORNING"  # 5:00 - 8:00
    MORNING = "MORNING"  # 8:00 - 12:00
    AFTERNOON = "AFTERNOON"  # 12:00 - 16:00
    EVENING = "EVENING"  # 16:00 - 20:00


class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    
    # Timing
    scheduled_date = Column(Date, nullable=False, index=True)
    time_window = Column(Enum(TimeWindow), default=TimeWindow.MORNING)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    # Expected workload
    expected_waste_kg = Column(Float, nullable=True)
    actual_waste_kg = Column(Float, nullable=True)
    
    # Status
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.PLANNED)
    priority = Column(Integer, default=1)  # 1-5, higher = more urgent
    
    # Execution details
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(String(500), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    zone = relationship("Zone", back_populates="schedules")
    vehicle = relationship("Vehicle", back_populates="schedules")
    route = relationship("Route", back_populates="schedule", uselist=False)
    worker_assignments = relationship("WorkerAssignment", back_populates="schedule")
    
    def __repr__(self):
        return f"<Schedule Zone:{self.zone_id} Date:{self.scheduled_date} Status:{self.status}>"
