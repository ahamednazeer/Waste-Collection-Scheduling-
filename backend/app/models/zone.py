"""
Zone model for collection areas
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class AreaType(str, enum.Enum):
    RESIDENTIAL = "RESIDENTIAL"
    COMMERCIAL = "COMMERCIAL"
    INDUSTRIAL = "INDUSTRIAL"
    MIXED = "MIXED"


class PriorityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Zone(Base):
    __tablename__ = "zones"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)  # e.g., "Z001"
    area_type = Column(Enum(AreaType), default=AreaType.RESIDENTIAL)
    priority_level = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    
    # Geographic data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    boundary_coordinates = Column(JSON, nullable=True)  # GeoJSON polygon
    area_sq_km = Column(Float, nullable=True)
    
    # Demographics
    population = Column(Integer, default=0)
    population_density = Column(Float, default=0.0)  # per sq km
    num_households = Column(Integer, default=0)
    
    # Collection settings
    default_collection_frequency = Column(Integer, default=2)  # times per week
    max_waste_capacity_kg = Column(Float, default=5000.0)
    
    # Metadata
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    waste_records = relationship("WasteRecord", back_populates="zone")
    schedules = relationship("Schedule", back_populates="zone")
    
    def __repr__(self):
        return f"<Zone {self.code}: {self.name}>"
