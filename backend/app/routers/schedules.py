"""
Schedule management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..models.schedule import Schedule
from ..models.zone import Zone
from ..models.vehicle import Vehicle
from ..models.user import User, UserRole
from ..schemas import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from ..auth import get_current_active_user, require_role

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.get("", response_model=List[ScheduleResponse])
async def get_schedules(
    zone_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get schedules with optional filters"""
    query = select(Schedule)
    
    filters = []
    if zone_id:
        filters.append(Schedule.zone_id == zone_id)
    if start_date:
        filters.append(Schedule.scheduled_date >= start_date)
    if end_date:
        filters.append(Schedule.scheduled_date <= end_date)
    if status:
        filters.append(Schedule.status == status)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(Schedule.scheduled_date.desc()).limit(limit)
    result = await db.execute(query)
    schedules = result.scalars().all()
    return [ScheduleResponse.model_validate(s) for s in schedules]


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific schedule"""
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ScheduleResponse.model_validate(schedule)


@router.post("", response_model=ScheduleResponse)
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Create a new schedule"""
    # Verify zone exists
    result = await db.execute(select(Zone).where(Zone.id == schedule_data.zone_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Verify vehicle if provided
    if schedule_data.vehicle_id:
        result = await db.execute(select(Vehicle).where(Vehicle.id == schedule_data.vehicle_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Vehicle not found")
    
    schedule = Schedule(**schedule_data.model_dump())
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return ScheduleResponse.model_validate(schedule)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Update a schedule"""
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    update_data = schedule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    
    await db.commit()
    await db.refresh(schedule)
    return ScheduleResponse.model_validate(schedule)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a schedule"""
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await db.delete(schedule)
    await db.commit()
    return {"message": "Schedule deleted successfully"}


@router.post("/generate")
async def generate_schedules(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Auto-generate schedules based on predictions and zone settings"""
    from ..services.scheduling_service import SchedulingService
    
    service = SchedulingService(db)
    schedules = await service.generate_schedules(start_date, end_date)
    
    return {
        "message": f"Generated {len(schedules)} schedules",
        "schedules_created": len(schedules)
    }
