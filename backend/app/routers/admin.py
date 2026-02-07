"""
Admin API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models.user import User, UserRole
from ..models.zone import Zone
from ..models.vehicle import Vehicle
from ..models.worker import Worker
from ..models.schedule import Schedule, ScheduleStatus
from ..models.waste_record import WasteRecord
from ..auth import get_current_active_user, require_role
from ..schemas import UserResponse, UserCreate, UserUpdate
from ..auth import get_password_hash

from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Get system-wide statistics"""
    # Users by role
    result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    users_by_role = {str(r.role.value): r[1] for r in result.all()}
    
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0
    
    # Total zones
    result = await db.execute(select(func.count(Zone.id)).where(Zone.is_active == 1))
    total_zones = result.scalar() or 0
    
    # Total vehicles
    result = await db.execute(select(func.count(Vehicle.id)).where(Vehicle.is_active == True))
    total_vehicles = result.scalar() or 0
    
    # Total workers
    result = await db.execute(select(func.count(Worker.id)).where(Worker.is_active == True))
    total_workers = result.scalar() or 0
    
    # Total schedules
    result = await db.execute(select(func.count(Schedule.id)))
    total_schedules = result.scalar() or 0
    
    # Total waste records
    result = await db.execute(select(func.count(WasteRecord.id)))
    total_waste_records = result.scalar() or 0
    
    return {
        "users": {
            "total": total_users,
            "byRole": users_by_role
        },
        "zones": total_zones,
        "vehicles": total_vehicles,
        "workers": total_workers,
        "schedules": total_schedules,
        "waste_records": total_waste_records
    }


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get all users (Admin only)"""
    result = await db.execute(select(User).order_by(User.username))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new user (Admin only)"""
    # Check if username exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update a user (Admin only)"""
    from fastapi import HTTPException
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a user (Admin only)"""
    from fastapi import HTTPException
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}
