"""
Database models for the Waste Collection Scheduling System
"""
from .user import User
from .zone import Zone
from .waste_record import WasteRecord
from .vehicle import Vehicle
from .worker import Worker
from .schedule import Schedule
from .route import Route
from .assignment import WorkerAssignment

__all__ = [
    "User",
    "Zone", 
    "WasteRecord",
    "Vehicle",
    "Worker",
    "Schedule",
    "Route",
    "WorkerAssignment"
]
