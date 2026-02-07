"""
Zone management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models.zone import Zone
from ..models.user import User, UserRole
from ..schemas import ZoneCreate, ZoneUpdate, ZoneResponse
from ..auth import get_current_active_user, require_role

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.get("", response_model=List[ZoneResponse])
async def get_zones(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all zones"""
    query = select(Zone)
    if not include_inactive:
        query = query.where(Zone.is_active == 1)
    query = query.order_by(Zone.code)
    result = await db.execute(query)
    zones = result.scalars().all()
    return [ZoneResponse.model_validate(z) for z in zones]


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific zone"""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return ZoneResponse.model_validate(zone)


@router.post("", response_model=ZoneResponse)
async def create_zone(
    zone_data: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Create a new zone (Admin/Supervisor only)"""
    # Check if code exists
    result = await db.execute(select(Zone).where(Zone.code == zone_data.code))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone code already exists"
        )
    
    zone = Zone(**zone_data.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return ZoneResponse.model_validate(zone)


@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: int,
    zone_data: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Update a zone (Admin/Supervisor only)"""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    update_data = zone_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(zone, field, value)
    
    await db.commit()
    await db.refresh(zone)
    return ZoneResponse.model_validate(zone)


@router.delete("/{zone_id}")
async def delete_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a zone (Admin only) - soft delete"""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone.is_active = 0
    await db.commit()
    return {"message": "Zone deleted successfully"}
