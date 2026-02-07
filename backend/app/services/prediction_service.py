"""
Prediction Service - AI/ML waste generation forecasting
"""
from datetime import date, timedelta
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ..models.zone import Zone
from ..models.waste_record import WasteRecord, WasteType


class PredictionService:
    """Service for waste generation prediction using ML models"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def predict_zone_waste(self, zone_id: int, days: int = 7) -> List[Dict]:
        """Predict waste for a specific zone over the next N days"""
        # Get historical data for the zone
        historical = await self._get_historical_data(zone_id, 90)  # Last 90 days
        
        if not historical:
            # No historical data - use zone defaults
            zone = await self._get_zone(zone_id)
            base_waste = zone.max_waste_capacity_kg * 0.3 if zone else 500.0
            return self._generate_default_predictions(base_waste, days)
        
        predictions = []
        today = date.today()
        
        for i in range(days):
            pred_date = today + timedelta(days=i + 1)
            predicted_kg = self._calculate_prediction(historical, pred_date)
            confidence = self._calculate_confidence(len(historical))
            
            predictions.append({
                "date": pred_date,
                "predicted_waste_kg": round(predicted_kg, 2),
                "confidence": round(confidence, 2)
            })
        
        return predictions
    
    async def generate_predictions(
        self, 
        start_date: date, 
        end_date: date, 
        zone_ids: Optional[List[int]] = None
    ) -> List[WasteRecord]:
        """Generate and store predictions for zones"""
        # Get zones to predict
        query = select(Zone).where(Zone.is_active == 1)
        if zone_ids:
            query = query.where(Zone.id.in_(zone_ids))
        
        result = await self.db.execute(query)
        zones = result.scalars().all()
        
        predictions_created = []
        current_date = start_date
        
        while current_date <= end_date:
            for zone in zones:
                # Get historical data for this zone
                historical = await self._get_historical_data(zone.id, 90)
                predicted_kg = self._calculate_prediction(historical, current_date)
                
                # Check if prediction already exists
                existing = await self.db.execute(
                    select(WasteRecord).where(and_(
                        WasteRecord.zone_id == zone.id,
                        WasteRecord.date == current_date,
                        WasteRecord.is_actual == False
                    ))
                )
                if existing.scalar_one_or_none():
                    continue
                
                # Create prediction record
                record = WasteRecord(
                    zone_id=zone.id,
                    date=current_date,
                    waste_quantity_kg=predicted_kg,
                    waste_type=WasteType.MIXED,
                    fill_level_percent=min(100, (predicted_kg / zone.max_waste_capacity_kg) * 100),
                    is_actual=False,
                    is_simulated=False
                )
                self.db.add(record)
                predictions_created.append(record)
            
            current_date += timedelta(days=1)
        
        await self.db.commit()
        return predictions_created
    
    async def retrain_model(self) -> Dict:
        """Retrain the prediction model with latest data"""
        # In a real implementation, this would retrain an ML model
        # For now, return mock metrics
        return {
            "model_version": "1.0.0",
            "training_samples": 1000,
            "mae": 45.2,
            "rmse": 67.8,
            "r2_score": 0.85
        }
    
    async def _get_historical_data(self, zone_id: int, days: int) -> List[Dict]:
        """Get historical waste data for a zone"""
        cutoff_date = date.today() - timedelta(days=days)
        
        result = await self.db.execute(
            select(WasteRecord)
            .where(and_(
                WasteRecord.zone_id == zone_id,
                WasteRecord.date >= cutoff_date,
                WasteRecord.is_actual == True
            ))
            .order_by(WasteRecord.date)
        )
        records = result.scalars().all()
        
        return [
            {
                "date": r.date,
                "waste_kg": r.waste_quantity_kg,
                "day_of_week": r.date.weekday()
            }
            for r in records
        ]
    
    async def _get_zone(self, zone_id: int) -> Optional[Zone]:
        """Get zone by ID"""
        result = await self.db.execute(select(Zone).where(Zone.id == zone_id))
        return result.scalar_one_or_none()
    
    def _calculate_prediction(self, historical: List[Dict], pred_date: date) -> float:
        """Calculate predicted waste using weighted moving average with seasonality"""
        if not historical:
            return 500.0  # Default fallback
        
        # Get average waste
        waste_values = [h["waste_kg"] for h in historical]
        avg_waste = np.mean(waste_values)
        
        # Day of week adjustment (weekends typically have different patterns)
        day_of_week = pred_date.weekday()
        dow_factors = {
            0: 1.1,   # Monday - higher (weekend accumulation)
            1: 1.0,   # Tuesday
            2: 1.0,   # Wednesday
            3: 1.0,   # Thursday
            4: 1.05,  # Friday - slightly higher
            5: 0.9,   # Saturday - lower (less commercial)
            6: 0.85   # Sunday - lowest
        }
        dow_adjustment = dow_factors.get(day_of_week, 1.0)
        
        # Calculate weighted average favoring recent data
        if len(waste_values) > 7:
            recent_avg = np.mean(waste_values[-7:])  # Last 7 days
            older_avg = np.mean(waste_values[:-7])   # Earlier data
            weighted_avg = 0.7 * recent_avg + 0.3 * older_avg
        else:
            weighted_avg = avg_waste
        
        # Apply day of week adjustment and add small random variation
        predicted = weighted_avg * dow_adjustment
        variation = np.random.uniform(-0.05, 0.05) * predicted
        
        return max(0, predicted + variation)
    
    def _calculate_confidence(self, sample_size: int) -> float:
        """Calculate prediction confidence based on data availability"""
        if sample_size >= 90:
            return 0.95
        elif sample_size >= 30:
            return 0.80 + (sample_size - 30) * 0.0025
        elif sample_size >= 7:
            return 0.60 + (sample_size - 7) * 0.0087
        else:
            return 0.40 + sample_size * 0.03
    
    def _generate_default_predictions(self, base_waste: float, days: int) -> List[Dict]:
        """Generate default predictions when no historical data exists"""
        predictions = []
        today = date.today()
        
        for i in range(days):
            pred_date = today + timedelta(days=i + 1)
            # Add some variation
            variation = np.random.uniform(0.8, 1.2)
            predicted_kg = base_waste * variation
            
            predictions.append({
                "date": pred_date,
                "predicted_waste_kg": round(predicted_kg, 2),
                "confidence": 0.40  # Low confidence for default predictions
            })
        
        return predictions
