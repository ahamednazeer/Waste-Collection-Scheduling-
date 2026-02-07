"""
WasteRecord model for tracking waste data
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class WasteType(str, enum.Enum):
    ORGANIC = "ORGANIC"
    RECYCLABLE = "RECYCLABLE"
    HAZARDOUS = "HAZARDOUS"
    GENERAL = "GENERAL"
    MIXED = "MIXED"


class WasteRecord(Base):
    __tablename__ = "waste_records"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    
    # Waste quantities
    waste_quantity_kg = Column(Float, nullable=False)
    waste_type = Column(Enum(WasteType), default=WasteType.MIXED)
    
    # Simulated bin fill level (0-100%)
    fill_level_percent = Column(Float, nullable=True)
    
    # Data source
    is_actual = Column(Boolean, default=True)  # True = actual, False = predicted
    is_simulated = Column(Boolean, default=False)
    
    # Additional metadata
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    zone = relationship("Zone", back_populates="waste_records")
    
    def __repr__(self):
        return f"<WasteRecord Zone:{self.zone_id} Date:{self.date} Qty:{self.waste_quantity_kg}kg>"
