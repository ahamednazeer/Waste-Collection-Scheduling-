"""
Analytics and Dashboard API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, timedelta

from ..database import get_db
from ..models.zone import Zone
from ..models.vehicle import Vehicle, VehicleStatus
from ..models.worker import Worker, WorkerStatus
from ..models.schedule import Schedule, ScheduleStatus
from ..models.waste_record import WasteRecord
from ..models.user import User
from ..schemas import DashboardStats, KPIMetrics
from ..auth import get_current_active_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard overview statistics"""
    today = date.today()
    
    # Count zones
    result = await db.execute(select(func.count(Zone.id)).where(Zone.is_active == 1))
    total_zones = result.scalar() or 0
    
    # Count active vehicles
    result = await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.is_active == True)
    )
    total_vehicles = result.scalar() or 0
    
    # Count active workers
    result = await db.execute(
        select(func.count(Worker.id)).where(Worker.is_active == True)
    )
    total_workers = result.scalar() or 0
    
    # Count active schedules (today and future, planned or in progress)
    result = await db.execute(
        select(func.count(Schedule.id)).where(and_(
            Schedule.scheduled_date >= today,
            Schedule.status.in_([ScheduleStatus.PLANNED, ScheduleStatus.IN_PROGRESS])
        ))
    )
    active_schedules = result.scalar() or 0
    
    # Count completed today
    result = await db.execute(
        select(func.count(Schedule.id)).where(and_(
            Schedule.scheduled_date == today,
            Schedule.status == ScheduleStatus.COMPLETED
        ))
    )
    completed_today = result.scalar() or 0
    
    # Total waste collected (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    result = await db.execute(
        select(func.sum(WasteRecord.waste_quantity_kg)).where(and_(
            WasteRecord.date >= thirty_days_ago,
            WasteRecord.is_actual == True
        ))
    )
    total_waste_collected_kg = result.scalar() or 0.0
    
    # Calculate collection efficiency (completed / total scheduled for past week)
    week_ago = today - timedelta(days=7)
    result = await db.execute(
        select(func.count(Schedule.id)).where(and_(
            Schedule.scheduled_date >= week_ago,
            Schedule.scheduled_date < today
        ))
    )
    total_past_week = result.scalar() or 1
    
    result = await db.execute(
        select(func.count(Schedule.id)).where(and_(
            Schedule.scheduled_date >= week_ago,
            Schedule.scheduled_date < today,
            Schedule.status == ScheduleStatus.COMPLETED
        ))
    )
    completed_past_week = result.scalar() or 0
    
    collection_efficiency = (completed_past_week / total_past_week * 100) if total_past_week > 0 else 0.0
    
    # Average route utilization (placeholder)
    avg_route_utilization = 75.0  # Would need route data
    
    return DashboardStats(
        total_zones=total_zones,
        total_vehicles=total_vehicles,
        total_workers=total_workers,
        active_schedules=active_schedules,
        completed_today=completed_today,
        total_waste_collected_kg=float(total_waste_collected_kg),
        collection_efficiency=round(collection_efficiency, 1),
        avg_route_utilization=avg_route_utilization
    )


@router.get("/kpis", response_model=KPIMetrics)
async def get_kpi_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get key performance indicators"""
    today = date.today()
    week_ago = today - timedelta(days=7)
    
    # Collection efficiency
    result = await db.execute(
        select(func.count(Schedule.id)).where(
            Schedule.scheduled_date >= week_ago
        )
    )
    total_schedules = result.scalar() or 1
    
    result = await db.execute(
        select(func.count(Schedule.id)).where(and_(
            Schedule.scheduled_date >= week_ago,
            Schedule.status == ScheduleStatus.COMPLETED
        ))
    )
    completed = result.scalar() or 0
    collection_efficiency = (completed / total_schedules * 100) if total_schedules > 0 else 0.0
    
    # Route utilization (placeholder - based on vehicle capacity usage)
    route_utilization = 72.5
    
    # Workforce productivity (assignments completed / total workers)
    result = await db.execute(
        select(func.count(Worker.id)).where(Worker.is_active == True)
    )
    total_workers = result.scalar() or 1
    workforce_productivity = (completed / total_workers) * 10 if total_workers > 0 else 0.0
    
    # On-time completion rate (placeholder)
    on_time_completion_rate = 88.5
    
    # Fuel efficiency (placeholder)
    fuel_efficiency = 8.2
    
    # Cost per ton (placeholder)
    cost_per_ton = 45.5
    
    return KPIMetrics(
        collection_efficiency=round(collection_efficiency, 1),
        route_utilization=round(route_utilization, 1),
        workforce_productivity=round(workforce_productivity, 1),
        on_time_completion_rate=round(on_time_completion_rate, 1),
        fuel_efficiency=round(fuel_efficiency, 1),
        cost_per_ton=round(cost_per_ton, 1)
    )


@router.get("/waste-trends")
async def get_waste_trends(
    days: int = 30,
    zone_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get waste collection trends over time"""
    today = date.today()
    start_date = today - timedelta(days=days)
    
    query = select(
        WasteRecord.date,
        func.sum(WasteRecord.waste_quantity_kg).label('total_kg')
    ).where(and_(
        WasteRecord.date >= start_date,
        WasteRecord.is_actual == True
    ))
    
    if zone_id:
        query = query.where(WasteRecord.zone_id == zone_id)
    
    query = query.group_by(WasteRecord.date).order_by(WasteRecord.date)
    
    result = await db.execute(query)
    records = result.all()
    
    return {
        "date_range": {
            "start": start_date.isoformat(),
            "end": today.isoformat()
        },
        "data": [
            {"date": r.date.isoformat(), "waste_kg": float(r.total_kg)}
            for r in records
        ]
    }


@router.get("/zone-performance")
async def get_zone_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get collection performance by zone"""
    today = date.today()
    month_ago = today - timedelta(days=30)
    
    result = await db.execute(
        select(
            Zone.id,
            Zone.name,
            Zone.code,
            func.sum(WasteRecord.waste_quantity_kg).label('total_waste_kg'),
            func.count(WasteRecord.id).label('collection_count')
        )
        .join(WasteRecord, WasteRecord.zone_id == Zone.id)
        .where(and_(
            WasteRecord.date >= month_ago,
            WasteRecord.is_actual == True
        ))
        .group_by(Zone.id, Zone.name, Zone.code)
        .order_by(func.sum(WasteRecord.waste_quantity_kg).desc())
    )
    records = result.all()
    
    return {
        "zones": [
            {
                "zone_id": r.id,
                "zone_name": r.name,
                "zone_code": r.code,
                "total_waste_kg": float(r.total_waste_kg or 0),
                "collection_count": r.collection_count
            }
            for r in records
        ]
    }
