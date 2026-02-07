"""
Vehicle management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models.vehicle import Vehicle
from ..models.user import User, UserRole
from ..schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from ..auth import get_current_active_user, require_role

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=List[VehicleResponse])
async def get_vehicles(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all vehicles"""
    query = select(Vehicle)
    if not include_inactive:
        query = query.where(Vehicle.is_active == True)
    query = query.order_by(Vehicle.registration_number)
    result = await db.execute(query)
    vehicles = result.scalars().all()
    return [VehicleResponse.model_validate(v) for v in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific vehicle"""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return VehicleResponse.model_validate(vehicle)


@router.post("", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Create a new vehicle"""
    # Check if registration exists
    result = await db.execute(
        select(Vehicle).where(Vehicle.registration_number == vehicle_data.registration_number)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Vehicle registration already exists")
    
    vehicle = Vehicle(**vehicle_data.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return VehicleResponse.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    vehicle_data: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Update a vehicle"""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = vehicle_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)
    
    await db.commit()
    await db.refresh(vehicle)
    return VehicleResponse.model_validate(vehicle)


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a vehicle (soft delete)"""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle.is_active = False
    await db.commit()
    return {"message": "Vehicle deleted successfully"}
