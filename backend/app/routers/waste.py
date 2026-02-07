"""
Waste records API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import date
import csv
import io

from ..database import get_db
from ..models.waste_record import WasteRecord
from ..models.zone import Zone
from ..models.user import User, UserRole
from ..schemas import WasteRecordCreate, WasteRecordResponse, WasteType
from ..auth import get_current_active_user, require_role

router = APIRouter(prefix="/waste", tags=["Waste Records"])


@router.get("/records", response_model=List[WasteRecordResponse])
async def get_waste_records(
    zone_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_actual: Optional[bool] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get waste records with optional filters"""
    query = select(WasteRecord)
    
    filters = []
    if zone_id:
        filters.append(WasteRecord.zone_id == zone_id)
    if start_date:
        filters.append(WasteRecord.date >= start_date)
    if end_date:
        filters.append(WasteRecord.date <= end_date)
    if is_actual is not None:
        filters.append(WasteRecord.is_actual == is_actual)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(WasteRecord.date.desc()).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()
    return [WasteRecordResponse.model_validate(r) for r in records]


@router.get("/records/{record_id}", response_model=WasteRecordResponse)
async def get_waste_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific waste record"""
    result = await db.execute(select(WasteRecord).where(WasteRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return WasteRecordResponse.model_validate(record)


@router.post("/records", response_model=WasteRecordResponse)
async def create_waste_record(
    record_data: WasteRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new waste record"""
    # Verify zone exists
    result = await db.execute(select(Zone).where(Zone.id == record_data.zone_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Zone not found")
    
    record = WasteRecord(**record_data.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return WasteRecordResponse.model_validate(record)


@router.post("/upload")
async def upload_waste_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Upload waste records from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    records_created = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            # Validate zone exists
            zone_code = row.get('zone_code', '').strip()
            result = await db.execute(select(Zone).where(Zone.code == zone_code))
            zone = result.scalar_one_or_none()
            
            if not zone:
                errors.append(f"Row {row_num}: Zone '{zone_code}' not found")
                continue
            
            record = WasteRecord(
                zone_id=zone.id,
                date=date.fromisoformat(row['date']),
                waste_quantity_kg=float(row['waste_quantity_kg']),
                waste_type=WasteType(row.get('waste_type', 'MIXED')),
                fill_level_percent=float(row['fill_level_percent']) if row.get('fill_level_percent') else None,
                is_actual=True,
                is_simulated=False
            )
            db.add(record)
            records_created += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    await db.commit()
    
    return {
        "message": f"Created {records_created} records",
        "errors": errors if errors else None
    }


@router.get("/summary")
async def get_waste_summary(
    zone_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get waste collection summary statistics"""
    from sqlalchemy import func
    
    query = select(
        func.count(WasteRecord.id).label('total_records'),
        func.sum(WasteRecord.waste_quantity_kg).label('total_waste_kg'),
        func.avg(WasteRecord.waste_quantity_kg).label('avg_waste_kg'),
        func.max(WasteRecord.waste_quantity_kg).label('max_waste_kg'),
        func.min(WasteRecord.waste_quantity_kg).label('min_waste_kg')
    ).where(WasteRecord.is_actual == True)
    
    if zone_id:
        query = query.where(WasteRecord.zone_id == zone_id)
    
    result = await db.execute(query)
    row = result.one()
    
    return {
        "total_records": row.total_records or 0,
        "total_waste_kg": float(row.total_waste_kg or 0),
        "avg_waste_kg": float(row.avg_waste_kg or 0),
        "max_waste_kg": float(row.max_waste_kg or 0),
        "min_waste_kg": float(row.min_waste_kg or 0)
    }
