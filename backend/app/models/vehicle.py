"""
Vehicle model for fleet management
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    IN_SERVICE = "IN_SERVICE"
    MAINTENANCE = "MAINTENANCE"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"


class VehicleType(str, enum.Enum):
    SMALL_TRUCK = "SMALL_TRUCK"  # Up to 3 tons
    MEDIUM_TRUCK = "MEDIUM_TRUCK"  # 3-7 tons
    LARGE_TRUCK = "LARGE_TRUCK"  # 7+ tons
    COMPACTOR = "COMPACTOR"


class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(20), unique=True, nullable=False)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.MEDIUM_TRUCK)
    
    # Capacity
    capacity_kg = Column(Float, nullable=False, default=5000.0)
    current_load_kg = Column(Float, default=0.0)
    
    # Performance
    fuel_efficiency_km_per_liter = Column(Float, default=8.0)
    average_speed_kmh = Column(Float, default=30.0)
    max_working_hours = Column(Float, default=8.0)
    
    # Status
    status = Column(Enum(VehicleStatus), default=VehicleStatus.AVAILABLE)
    is_active = Column(Boolean, default=True)
    
    # Location (current)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    
    # Maintenance
    last_maintenance_date = Column(DateTime(timezone=True), nullable=True)
    next_maintenance_date = Column(DateTime(timezone=True), nullable=True)
    total_km_driven = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    schedules = relationship("Schedule", back_populates="vehicle")
    
    def __repr__(self):
        return f"<Vehicle {self.registration_number} ({self.vehicle_type})>"
