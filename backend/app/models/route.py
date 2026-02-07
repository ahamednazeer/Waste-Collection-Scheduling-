"""
Route model for optimized collection routes
"""
from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class RouteStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    OPTIMIZED = "OPTIMIZED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, unique=True)
    
    # Route path (ordered list of coordinates)
    waypoints = Column(JSON, nullable=False)  # [{lat, lng, zone_id, order}]
    
    # Metrics
    total_distance_km = Column(Float, default=0.0)
    estimated_duration_min = Column(Float, default=0.0)
    actual_duration_min = Column(Float, nullable=True)
    
    # Optimization details
    optimization_algorithm = Column(String, default="nearest_neighbor")
    fuel_cost_estimate = Column(Float, nullable=True)
    
    # Status
    status = Column(Enum(RouteStatus), default=RouteStatus.GENERATED)
    
    # Execution tracking
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    schedule = relationship("Schedule", back_populates="route")
    
    def __repr__(self):
        return f"<Route {self.id} Distance:{self.total_distance_km}km>"
