"""
Prediction API endpoints - Using Advanced ML Model
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models.zone import Zone
from ..models.waste_record import WasteRecord
from ..models.user import User, UserRole
from ..schemas import ZonePrediction, PredictionGenerationRequest
from ..auth import get_current_active_user, require_role

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/zone/{zone_id}")
async def get_zone_predictions(
    zone_id: int,
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get waste predictions for a specific zone using ML model"""
    from ..services.advanced_prediction_service import AdvancedPredictionService
    
    # Verify zone exists
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    service = AdvancedPredictionService(db)
    predictions = await service.predict_zone_waste(zone_id, days)
    
    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "model_type": "XGBoost",
        "predictions": [
            {
                "date": p["date"].isoformat(),
                "predicted_waste_kg": p["predicted_waste_kg"],
                "confidence": p["confidence"]
            }
            for p in predictions
        ]
    }


@router.post("/generate")
async def generate_predictions(
    request: PredictionGenerationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    """Generate waste predictions for all or selected zones using ML model"""
    from ..services.advanced_prediction_service import AdvancedPredictionService
    
    start_date = request.start_date
    end_date = request.end_date
    zone_ids = request.zone_ids
    
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=14)
    
    service = AdvancedPredictionService(db)
    predictions = await service.generate_predictions(start_date, end_date, zone_ids)
    
    return {
        "message": f"Generated {len(predictions)} ML-based predictions",
        "model_type": "XGBoost",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "predictions_count": len(predictions)
    }


@router.get("/all")
async def get_all_predictions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all predictions within date range"""
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=14)
    
    from sqlalchemy import and_
    
    result = await db.execute(
        select(WasteRecord, Zone)
        .join(Zone)
        .where(and_(
            WasteRecord.is_actual == False,
            WasteRecord.date >= start_date,
            WasteRecord.date <= end_date
        ))
        .order_by(WasteRecord.date)
    )
    records = result.all()
    
    predictions = []
    for record, zone in records:
        predictions.append({
            "zone_id": record.zone_id,
            "zone_name": zone.name,
            "date": record.date.isoformat(),
            "predicted_waste_kg": record.waste_quantity_kg,
            "waste_type": record.waste_type.value
        })
    
    return {
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "predictions": predictions
    }


@router.post("/retrain")
async def retrain_model(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Retrain the ML prediction model with synthetic training data (Admin only)"""
    from ..services.advanced_prediction_service import AdvancedPredictionService
    
    service = AdvancedPredictionService(db)
    result = await service.retrain_model()
    
    return {
        "message": "ML model retrained successfully",
        "metrics": result
    }


@router.get("/model-info")
async def get_model_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get information about the current ML model"""
    from ..services.advanced_prediction_service import AdvancedPredictionService
    import os
    
    service = AdvancedPredictionService(db)
    model_exists = service.model is not None
    metrics = service.metrics or {}
    training_metrics = None
    if metrics:
        training_metrics = {
            "mae": metrics.get("mae"),
            "rmse": metrics.get("rmse"),
            "r2_score": metrics.get("r2_score")
        }
    
    return {
        "model_type": "XGBRegressor",
        "model_loaded": model_exists,
        "training_metrics": training_metrics,
        "features_count": 19,
        "features": [
            "day_of_week", "day_of_month", "month", "is_weekend",
            "is_month_start", "is_month_end", "day_sin", "day_cos",
            "month_sin", "month_cos", "area_type", "priority",
            "population", "density", "frequency", "capacity",
            "is_summer", "is_monsoon", "is_festival_season"
        ],
        "training_data_days": 180,
        "algorithm": "XGBoost (XGBRegressor)"
    }
