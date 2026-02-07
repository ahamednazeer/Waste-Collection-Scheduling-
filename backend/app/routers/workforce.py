"""
Worker management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
from datetime import date, timedelta, datetime
from collections import defaultdict

from ..database import get_db
from ..models.worker import Worker
from ..models.user import User, UserRole
from ..schemas import (
    WorkerCreate,
    WorkerUpdate,
    WorkerResponse,
    WorkerAssignmentCreate,
    WorkerAssignmentUpdate,
    WorkerAssignmentResponse,
    WorkerCheckInRequest,
    WorkerCheckOutRequest,
    WorkerAssignmentsRequest,
    AutoAssignRequest,
)
from ..auth import get_current_active_user, require_role, get_password_hash, verify_password

router = APIRouter(prefix="/workforce", tags=["Workforce"])


@router.get("", response_model=List[WorkerResponse])
async def get_workers(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all workers"""
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule, ScheduleStatus

    query = select(Worker)
    if not include_inactive:
        query = query.where(Worker.is_active == True)
    query = query.order_by(Worker.employee_id)
    result = await db.execute(query)
    workers = result.scalars().all()

    # Compute current week hours from assignments (Mon-Sun).
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(
            WorkerAssignment.worker_id,
            WorkerAssignment.hours_worked,
            WorkerAssignment.check_in_time,
            WorkerAssignment.check_out_time,
        )
        .join(Schedule, Schedule.id == WorkerAssignment.schedule_id)
        .where(and_(
            Schedule.scheduled_date >= week_start,
            Schedule.scheduled_date < week_end
        ))
    )

    hours_by_worker = defaultdict(float)
    week_assignments_by_worker = defaultdict(int)
    for row in result.all():
        hours = row.hours_worked or 0.0
        if (hours == 0.0) and row.check_in_time and row.check_out_time:
            delta = row.check_out_time - row.check_in_time
            hours = max(delta.total_seconds() / 3600.0, 0.0)
        hours_by_worker[row.worker_id] += hours
        week_assignments_by_worker[row.worker_id] += 1

    result = await db.execute(
        select(
            WorkerAssignment.worker_id,
            func.count(WorkerAssignment.id)
        ).group_by(WorkerAssignment.worker_id)
    )
    total_assignments = {row[0]: row[1] for row in result.all()}

    response = []
    for worker in workers:
        data = WorkerResponse.model_validate(worker).model_dump()
        data["current_week_hours"] = round(hours_by_worker.get(worker.id, 0.0), 1)
        data["current_week_assignments"] = week_assignments_by_worker.get(worker.id, 0)
        data["total_assignments"] = total_assignments.get(worker.id, 0)
        response.append(data)

    return response


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific worker"""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule, ScheduleStatus

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(
            WorkerAssignment.hours_worked,
            WorkerAssignment.check_in_time,
            WorkerAssignment.check_out_time,
        )
        .join(Schedule, Schedule.id == WorkerAssignment.schedule_id)
        .where(and_(
            WorkerAssignment.worker_id == worker_id,
            Schedule.scheduled_date >= week_start,
            Schedule.scheduled_date < week_end
        ))
    )
    hours = 0.0
    week_assignments = 0
    for row in result.all():
        row_hours = row.hours_worked or 0.0
        if (row_hours == 0.0) and row.check_in_time and row.check_out_time:
            delta = row.check_out_time - row.check_in_time
            row_hours = max(delta.total_seconds() / 3600.0, 0.0)
        hours += row_hours
        week_assignments += 1

    result = await db.execute(
        select(func.count(WorkerAssignment.id)).where(WorkerAssignment.worker_id == worker_id)
    )
    total_assignments = result.scalar() or 0

    data = WorkerResponse.model_validate(worker).model_dump()
    data["current_week_hours"] = round(hours, 1)
    data["current_week_assignments"] = week_assignments
    data["total_assignments"] = total_assignments
    return data


@router.post("", response_model=WorkerResponse)
async def create_worker(
    worker_data: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Create a new worker"""
    # Check if employee_id exists
    result = await db.execute(
        select(Worker).where(Worker.employee_id == worker_data.employee_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    data = worker_data.model_dump(exclude={"pin"})
    worker = Worker(**data)
    if worker_data.pin:
        worker.pin_hash = get_password_hash(worker_data.pin)
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return WorkerResponse.model_validate(worker)


@router.put("/{worker_id}", response_model=WorkerResponse)
async def update_worker(
    worker_id: int,
    worker_data: WorkerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Update a worker"""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    update_data = worker_data.model_dump(exclude_unset=True)
    pin = update_data.pop("pin", None)
    for field, value in update_data.items():
        setattr(worker, field, value)
    if pin:
        worker.pin_hash = get_password_hash(pin)
    
    await db.commit()
    await db.refresh(worker)
    return WorkerResponse.model_validate(worker)


@router.delete("/{worker_id}")
async def delete_worker(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a worker (soft delete)"""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    worker.is_active = False
    await db.commit()
    return {"message": "Worker deleted successfully"}


@router.get("/{worker_id}/assignments")
async def get_worker_assignments(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all assignments for a worker"""
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule
    
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    result = await db.execute(
        select(WorkerAssignment)
        .where(WorkerAssignment.worker_id == worker_id)
        .order_by(WorkerAssignment.created_at.desc())
        .limit(50)
    )
    assignments = result.scalars().all()
    
    return {
        "worker_id": worker_id,
        "worker_name": worker.full_name,
        "total_assignments": len(assignments),
        "assignments": [
            {
                "id": a.id,
                "schedule_id": a.schedule_id,
                "status": a.status.value,
                "hours_worked": a.hours_worked,
                "waste_collected_kg": a.waste_collected_kg
            }
            for a in assignments
        ]
    }


def _parse_schedule_code(schedule_code: str | None) -> int | None:
    if not schedule_code:
        return None
    code = schedule_code.strip().upper()
    if code.startswith("SCH-"):
        code = code[4:]
    return int(code) if code.isdigit() else None


async def _get_schedule_for_self_service(
    db: AsyncSession,
    schedule_id: int | None,
    zone_id: int | None,
    time_window: str | None
):
    from ..models.schedule import Schedule, TimeWindow

    if schedule_id:
        result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
        return result.scalar_one_or_none()

    if not zone_id or not time_window:
        return None

    try:
        window_enum = TimeWindow(time_window.upper())
    except Exception:
        return None

    result = await db.execute(
        select(Schedule)
        .where(and_(
            Schedule.scheduled_date == date.today(),
            Schedule.zone_id == zone_id,
            Schedule.time_window == window_enum
        ))
        .order_by(Schedule.id)
    )
    return result.scalars().first()


def _require_valid_pin(worker: Worker, pin: str):
    if not worker.pin_hash:
        raise HTTPException(status_code=400, detail="PIN not set for this worker")
    if not verify_password(pin, worker.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid PIN")


async def _update_schedule_and_vehicle_metrics(db: AsyncSession, schedule_id: int) -> None:
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule, ScheduleStatus
    from ..models.vehicle import Vehicle
    from ..models.route import Route

    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        return

    waste_result = await db.execute(
        select(func.coalesce(func.sum(WorkerAssignment.waste_collected_kg), 0.0))
        .where(WorkerAssignment.schedule_id == schedule_id)
    )
    total_waste = float(waste_result.scalar() or 0.0)
    schedule.actual_waste_kg = total_waste

    remaining_result = await db.execute(
        select(func.count(WorkerAssignment.id))
        .where(and_(
            WorkerAssignment.schedule_id == schedule_id,
            WorkerAssignment.check_out_time.is_(None)
        ))
    )
    remaining = remaining_result.scalar() or 0
    was_completed = schedule.status == ScheduleStatus.COMPLETED
    if remaining == 0:
        schedule.status = ScheduleStatus.COMPLETED
        if not schedule.completed_at:
            schedule.completed_at = datetime.utcnow()

    if schedule.vehicle_id:
        result = await db.execute(select(Vehicle).where(Vehicle.id == schedule.vehicle_id))
        vehicle = result.scalar_one_or_none()
        if vehicle:
            vehicle.current_load_kg = total_waste
            if not was_completed and schedule.status == ScheduleStatus.COMPLETED:
                route_result = await db.execute(select(Route).where(Route.schedule_id == schedule_id))
                route = route_result.scalar_one_or_none()
                if route and route.total_distance_km:
                    vehicle.total_km_driven = (vehicle.total_km_driven or 0.0) + route.total_distance_km


@router.post("/{worker_id}/assignments", response_model=WorkerAssignmentResponse)
async def create_worker_assignment(
    worker_id: int,
    assignment_data: WorkerAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Assign a worker to a schedule"""
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule

    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(select(Schedule).where(Schedule.id == assignment_data.schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    result = await db.execute(
        select(WorkerAssignment).where(and_(
            WorkerAssignment.worker_id == worker_id,
            WorkerAssignment.schedule_id == assignment_data.schedule_id
        ))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Worker is already assigned to this schedule")

    assigned_role = assignment_data.assigned_role
    if not assigned_role:
        assigned_role = worker.role.value if hasattr(worker.role, "value") else str(worker.role)

    assignment = WorkerAssignment(
        worker_id=worker_id,
        schedule_id=assignment_data.schedule_id,
        assigned_role=assigned_role
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return WorkerAssignmentResponse.model_validate(assignment)


@router.put("/{worker_id}/assignments/{assignment_id}", response_model=WorkerAssignmentResponse)
async def update_worker_assignment(
    worker_id: int,
    assignment_id: int,
    assignment_data: WorkerAssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Update assignment (log hours, status, etc.)"""
    from ..models.assignment import WorkerAssignment

    result = await db.execute(
        select(WorkerAssignment).where(and_(
            WorkerAssignment.id == assignment_id,
            WorkerAssignment.worker_id == worker_id
        ))
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = assignment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    if "hours_worked" not in update_data and assignment.check_in_time and assignment.check_out_time:
        delta = assignment.check_out_time - assignment.check_in_time
        assignment.hours_worked = max(delta.total_seconds() / 3600.0, 0.0)

    if any(field in update_data for field in ("check_out_time", "status", "waste_collected_kg")):
        await _update_schedule_and_vehicle_metrics(db, assignment.schedule_id)

    await db.commit()
    await db.refresh(assignment)
    return WorkerAssignmentResponse.model_validate(assignment)


@router.get("/self-service/zones")
async def get_self_service_zones(
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for kiosk/self-service zone selection"""
    from ..models.zone import Zone

    result = await db.execute(
        select(Zone).where(Zone.is_active == True).order_by(Zone.code)
    )
    zones = result.scalars().all()
    return [
        {"id": z.id, "code": z.code, "name": z.name}
        for z in zones
    ]


@router.get("/self-service/schedules")
async def get_self_service_schedules(
    date_str: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for kiosk/self-service schedule selection"""
    from ..models.schedule import Schedule
    from ..models.zone import Zone

    target_date = date_str or date.today()
    result = await db.execute(
        select(Schedule, Zone)
        .join(Zone, Zone.id == Schedule.zone_id)
        .where(Schedule.scheduled_date == target_date)
        .order_by(Schedule.time_window, Schedule.id)
    )
    rows = result.all()

    data = []
    for schedule, zone in rows:
        time_window = schedule.time_window.value if hasattr(schedule.time_window, "value") else str(schedule.time_window)
        status = schedule.status.value if hasattr(schedule.status, "value") else str(schedule.status)
        data.append({
            "id": schedule.id,
            "schedule_code": f"SCH-{schedule.id}",
            "scheduled_date": schedule.scheduled_date.isoformat(),
            "time_window": time_window,
            "status": status,
            "zone_id": zone.id,
            "zone_code": zone.code,
            "zone_name": zone.name,
        })

    return {
        "date": target_date.isoformat(),
        "schedules": data
    }


@router.post("/self-service/check-in")
async def self_service_check_in(
    payload: WorkerCheckInRequest,
    db: AsyncSession = Depends(get_db)
):
    """Self-service check-in (no auth)"""
    from ..models.assignment import WorkerAssignment, AssignmentStatus
    from ..models.schedule import Schedule, ScheduleStatus

    result = await db.execute(select(Worker).where(Worker.employee_id == payload.employee_id))
    worker = result.scalar_one_or_none()
    if not worker or not worker.is_active:
        raise HTTPException(status_code=404, detail="Worker not found")
    _require_valid_pin(worker, payload.pin)

    schedule_id = payload.schedule_id or _parse_schedule_code(payload.schedule_code)
    schedule = await _get_schedule_for_self_service(db, schedule_id, payload.zone_id, payload.time_window)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found for selection")

    today = date.today()
    if schedule.scheduled_date != today:
        raise HTTPException(status_code=400, detail="Check-in is only allowed for today's schedules")

    result = await db.execute(
        select(WorkerAssignment).where(and_(
            WorkerAssignment.worker_id == worker.id,
            WorkerAssignment.schedule_id == schedule.id
        ))
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        assigned_role = worker.role.value if hasattr(worker.role, "value") else str(worker.role)
        assignment = WorkerAssignment(
            worker_id=worker.id,
            schedule_id=schedule.id,
            assigned_role=assigned_role,
            status=AssignmentStatus.IN_PROGRESS,
            check_in_time=datetime.utcnow()
        )
        db.add(assignment)
    else:
        if not assignment.check_in_time:
            assignment.check_in_time = datetime.utcnow()
        assignment.status = AssignmentStatus.IN_PROGRESS

    if schedule.status != ScheduleStatus.IN_PROGRESS:
        schedule.status = ScheduleStatus.IN_PROGRESS
    if not schedule.started_at:
        schedule.started_at = datetime.utcnow()

    await db.commit()
    await db.refresh(assignment)

    return {
        "message": "Checked in successfully",
        "assignment": WorkerAssignmentResponse.model_validate(assignment)
    }


@router.post("/self-service/check-out")
async def self_service_check_out(
    payload: WorkerCheckOutRequest,
    db: AsyncSession = Depends(get_db)
):
    """Self-service check-out (no auth)"""
    from ..models.assignment import WorkerAssignment, AssignmentStatus

    result = await db.execute(select(Worker).where(Worker.employee_id == payload.employee_id))
    worker = result.scalar_one_or_none()
    if not worker or not worker.is_active:
        raise HTTPException(status_code=404, detail="Worker not found")
    _require_valid_pin(worker, payload.pin)

    schedule_id = payload.schedule_id or _parse_schedule_code(payload.schedule_code)
    schedule = await _get_schedule_for_self_service(db, schedule_id, payload.zone_id, payload.time_window)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found for selection")

    result = await db.execute(
        select(WorkerAssignment).where(and_(
            WorkerAssignment.worker_id == worker.id,
            WorkerAssignment.schedule_id == schedule.id
        ))
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found for this worker and schedule")

    assignment.check_out_time = datetime.utcnow()

    if payload.hours_worked is not None:
        assignment.hours_worked = payload.hours_worked
    elif assignment.check_in_time and assignment.check_out_time:
        delta = assignment.check_out_time - assignment.check_in_time
        assignment.hours_worked = max(delta.total_seconds() / 3600.0, 0.0)

    if payload.waste_collected_kg is not None:
        assignment.waste_collected_kg = payload.waste_collected_kg

    assignment.status = AssignmentStatus.COMPLETED

    await _update_schedule_and_vehicle_metrics(db, schedule.id)

    await db.commit()
    await db.refresh(assignment)

    return {
        "message": "Checked out successfully",
        "assignment": WorkerAssignmentResponse.model_validate(assignment)
    }


@router.post("/self-service/my-assignments")
async def get_self_service_assignments(
    payload: WorkerAssignmentsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for worker to view their assignments"""
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule
    from ..models.zone import Zone

    result = await db.execute(select(Worker).where(Worker.employee_id == payload.employee_id))
    worker = result.scalar_one_or_none()
    if not worker or not worker.is_active:
        raise HTTPException(status_code=404, detail="Worker not found")
    _require_valid_pin(worker, payload.pin)

    today = date.today()
    start_date = payload.start_date
    end_date = payload.end_date
    if not start_date or not end_date:
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        start_date = start_date or week_start
        end_date = end_date or week_end

    result = await db.execute(
        select(WorkerAssignment, Schedule, Zone)
        .join(Schedule, Schedule.id == WorkerAssignment.schedule_id)
        .join(Zone, Zone.id == Schedule.zone_id)
        .where(and_(
            WorkerAssignment.worker_id == worker.id,
            Schedule.scheduled_date >= start_date,
            Schedule.scheduled_date <= end_date
        ))
        .order_by(Schedule.scheduled_date.desc())
    )

    items = []
    for assignment, schedule, zone in result.all():
        time_window = schedule.time_window.value if hasattr(schedule.time_window, "value") else str(schedule.time_window)
        schedule_status = schedule.status.value if hasattr(schedule.status, "value") else str(schedule.status)
        assignment_status = assignment.status.value if hasattr(assignment.status, "value") else str(assignment.status)
        items.append({
            "assignment_id": assignment.id,
            "schedule_id": schedule.id,
            "scheduled_date": schedule.scheduled_date.isoformat(),
            "time_window": time_window,
            "schedule_status": schedule_status,
            "assignment_status": assignment_status,
            "zone_code": zone.code,
            "zone_name": zone.name,
            "check_in_time": assignment.check_in_time.isoformat() if assignment.check_in_time else None,
            "check_out_time": assignment.check_out_time.isoformat() if assignment.check_out_time else None,
            "hours_worked": assignment.hours_worked,
            "waste_collected_kg": assignment.waste_collected_kg,
        })

    return {
        "worker_id": worker.id,
        "worker_name": worker.full_name,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "assignments": items
    }


@router.post("/auto-assign")
async def auto_assign_workers(
    payload: AutoAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Auto-assign workers to schedules in a date range."""
    from ..models.assignment import WorkerAssignment
    from ..models.schedule import Schedule, ScheduleStatus
    from ..models.worker import WorkerStatus, WorkerRole

    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    result = await db.execute(
        select(Schedule)
        .where(and_(
            Schedule.scheduled_date >= payload.start_date,
            Schedule.scheduled_date <= payload.end_date,
            Schedule.status.in_([ScheduleStatus.PLANNED, ScheduleStatus.IN_PROGRESS])
        ))
        .order_by(Schedule.scheduled_date, Schedule.time_window)
    )
    schedules = result.scalars().all()
    if not schedules:
        return {"message": "No schedules found for the selected range", "assignments_created": 0}

    # Existing assignments for the range
    result = await db.execute(
        select(WorkerAssignment, Schedule)
        .join(Schedule, Schedule.id == WorkerAssignment.schedule_id)
        .where(and_(
            Schedule.scheduled_date >= payload.start_date,
            Schedule.scheduled_date <= payload.end_date,
            Schedule.status.in_([ScheduleStatus.PLANNED, ScheduleStatus.IN_PROGRESS])
        ))
    )

    assignments_by_schedule = defaultdict(list)
    busy_by_slot = defaultdict(set)
    assignment_count_by_worker = defaultdict(int)

    for assignment, schedule in result.all():
        assignments_by_schedule[schedule.id].append(assignment)
        time_window = schedule.time_window.value if hasattr(schedule.time_window, "value") else str(schedule.time_window)
        slot_key = (schedule.scheduled_date, time_window)
        busy_by_slot[slot_key].add(assignment.worker_id)
        assignment_count_by_worker[assignment.worker_id] += 1

    def _get_workers_by_role(role: WorkerRole):
        return select(Worker).where(and_(
            Worker.is_active == True,
            Worker.status == WorkerStatus.AVAILABLE,
            Worker.role == role
        ))

    result = await db.execute(_get_workers_by_role(WorkerRole.DRIVER))
    drivers = result.scalars().all()
    result = await db.execute(_get_workers_by_role(WorkerRole.COLLECTOR))
    collectors = result.scalars().all()
    result = await db.execute(_get_workers_by_role(WorkerRole.SUPERVISOR))
    supervisors = result.scalars().all()

    def pick_workers(role_workers, needed, slot_key):
        candidates = [
            w for w in role_workers
            if w.id not in busy_by_slot[slot_key]
        ]
        candidates.sort(key=lambda w: assignment_count_by_worker.get(w.id, 0))
        selected = candidates[: max(0, needed)]
        return selected

    created = 0

    for schedule in schedules:
        time_window = schedule.time_window.value if hasattr(schedule.time_window, "value") else str(schedule.time_window)
        slot_key = (schedule.scheduled_date, time_window)
        existing = assignments_by_schedule.get(schedule.id, [])
        existing_roles = [a.assigned_role for a in existing]

        needed_drivers = max(payload.drivers_per_schedule - existing_roles.count("DRIVER"), 0)
        needed_collectors = max(payload.collectors_per_schedule - existing_roles.count("COLLECTOR"), 0)
        needed_supervisors = max(payload.supervisors_per_schedule - existing_roles.count("SUPERVISOR"), 0)

        for worker in pick_workers(drivers, needed_drivers, slot_key):
            assignment = WorkerAssignment(
                worker_id=worker.id,
                schedule_id=schedule.id,
                assigned_role="DRIVER"
            )
            db.add(assignment)
            assignments_by_schedule[schedule.id].append(assignment)
            busy_by_slot[slot_key].add(worker.id)
            assignment_count_by_worker[worker.id] += 1
            created += 1

        for worker in pick_workers(collectors, needed_collectors, slot_key):
            assignment = WorkerAssignment(
                worker_id=worker.id,
                schedule_id=schedule.id,
                assigned_role="COLLECTOR"
            )
            db.add(assignment)
            assignments_by_schedule[schedule.id].append(assignment)
            busy_by_slot[slot_key].add(worker.id)
            assignment_count_by_worker[worker.id] += 1
            created += 1

        for worker in pick_workers(supervisors, needed_supervisors, slot_key):
            assignment = WorkerAssignment(
                worker_id=worker.id,
                schedule_id=schedule.id,
                assigned_role="SUPERVISOR"
            )
            db.add(assignment)
            assignments_by_schedule[schedule.id].append(assignment)
            busy_by_slot[slot_key].add(worker.id)
            assignment_count_by_worker[worker.id] += 1
            created += 1

    await db.commit()

    return {
        "message": f"Auto-assigned {created} workers across {len(schedules)} schedules",
        "assignments_created": created,
        "schedules_processed": len(schedules)
    }
