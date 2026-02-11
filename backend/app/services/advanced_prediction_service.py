"""
Advanced ML Prediction Service with XGBoost and feature engineering
"""
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
import numpy as np
import pickle
import os
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ..models.zone import Zone, AreaType, PriorityLevel
from ..models.waste_record import WasteRecord, WasteType

# ML imports
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

MODEL_PATH = "models/waste_predictor_xgb.pkl"
SCALER_PATH = "models/scaler_xgb.pkl"
METRICS_PATH = "models/metrics_xgb.json"


class AdvancedPredictionService:
    """Advanced ML-based waste prediction service using XGBoost"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.model: Optional[XGBRegressor] = None
        self.scaler: Optional[StandardScaler] = None
        self.metrics: Optional[Dict] = None
        self.area_encoder = LabelEncoder()
        self.priority_encoder = LabelEncoder()
        
        # Fit encoders with known values
        self.area_encoder.fit(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED'])
        self.priority_encoder.fit(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        
        # Try to load existing model
        self._load_model()
    
    def _load_model(self):
        """Load pre-trained model if exists"""
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
                with open(MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                with open(SCALER_PATH, 'rb') as f:
                    self.scaler = pickle.load(f)
            if os.path.exists(METRICS_PATH):
                with open(METRICS_PATH, 'r') as f:
                    self.metrics = json.load(f)
        except Exception as e:
            print(f"Could not load model: {e}")
            self.model = None
            self.scaler = None
            self.metrics = None
    
    def _save_model(self):
        """Save trained model to disk"""
        os.makedirs("models", exist_ok=True)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(self.model, f)
        with open(SCALER_PATH, 'wb') as f:
            pickle.dump(self.scaler, f)

    def _save_metrics(self, metrics: Dict):
        """Save latest training metrics to disk"""
        os.makedirs("models", exist_ok=True)
        with open(METRICS_PATH, 'w') as f:
            json.dump(metrics, f)
        self.metrics = metrics
    
    def _extract_features(self, record_date: date, zone: Zone) -> np.ndarray:
        """Extract features for prediction"""
        # Temporal features
        day_of_week = record_date.weekday()
        day_of_month = record_date.day
        month = record_date.month
        is_weekend = 1 if day_of_week >= 5 else 0
        is_month_start = 1 if day_of_month <= 7 else 0
        is_month_end = 1 if day_of_month >= 25 else 0
        
        # Cyclical encoding for temporal features
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)
        
        # Zone features
        area_type_encoded = self.area_encoder.transform([zone.area_type.value])[0]
        priority_encoded = self.priority_encoder.transform([zone.priority_level.value])[0]
        population = zone.population or 0
        population_density = zone.population_density or 0
        collection_frequency = zone.default_collection_frequency or 2
        max_capacity = zone.max_waste_capacity_kg or 5000
        
        # Seasonal indicators
        is_summer = 1 if month in [4, 5, 6] else 0
        is_monsoon = 1 if month in [7, 8, 9] else 0
        is_festival_season = 1 if month in [10, 11, 12] else 0
        
        features = np.array([
            day_of_week,
            day_of_month,
            month,
            is_weekend,
            is_month_start,
            is_month_end,
            day_sin,
            day_cos,
            month_sin,
            month_cos,
            area_type_encoded,
            priority_encoded,
            population / 10000,  # Normalize
            population_density / 1000,  # Normalize
            collection_frequency,
            max_capacity / 1000,  # Normalize
            is_summer,
            is_monsoon,
            is_festival_season
        ])
        
        return features.reshape(1, -1)
    
    async def generate_training_data(self, days: int = 180) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic training data based on realistic patterns"""
        # Get all zones
        result = await self.db.execute(select(Zone).where(Zone.is_active == 1))
        zones = result.scalars().all()
        
        if not zones:
            raise ValueError("No zones available for training data generation")
        
        X_list = []
        y_list = []
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        for zone in zones:
            current_date = start_date
            
            # Zone-specific base waste (based on characteristics)
            base_waste = self._calculate_base_waste(zone)
            
            while current_date <= end_date:
                # Extract features
                features = self._extract_features(current_date, zone)
                
                # Calculate realistic waste amount with patterns
                waste_amount = self._simulate_waste(current_date, zone, base_waste)
                
                X_list.append(features.flatten())
                y_list.append(waste_amount)
                
                current_date += timedelta(days=1)
        
        return np.array(X_list), np.array(y_list)
    
    def _calculate_base_waste(self, zone: Zone) -> float:
        """Calculate base waste based on zone characteristics"""
        # Area type multipliers
        area_multipliers = {
            AreaType.RESIDENTIAL: 0.8,
            AreaType.COMMERCIAL: 1.3,
            AreaType.INDUSTRIAL: 1.8,
            AreaType.MIXED: 1.1
        }
        
        # Priority multipliers (higher priority = more waste typically)
        priority_multipliers = {
            PriorityLevel.LOW: 0.7,
            PriorityLevel.MEDIUM: 1.0,
            PriorityLevel.HIGH: 1.3,
            PriorityLevel.CRITICAL: 1.5
        }
        
        # Base calculation from population
        population = zone.population or 10000
        base = population * 0.015  # ~15g per person per day baseline
        
        # Apply multipliers
        base *= area_multipliers.get(zone.area_type, 1.0)
        base *= priority_multipliers.get(zone.priority_level, 1.0)
        
        # Cap to reasonable range
        return max(100, min(base, zone.max_waste_capacity_kg or 10000))
    
    def _simulate_waste(self, record_date: date, zone: Zone, base_waste: float) -> float:
        """Simulate realistic waste generation with patterns"""
        waste = base_waste
        
        # Day of week pattern
        dow = record_date.weekday()
        dow_factors = {
            0: 1.15,  # Monday - high (weekend accumulation)
            1: 1.0,   # Tuesday
            2: 0.95,  # Wednesday
            3: 1.0,   # Thursday
            4: 1.1,   # Friday - higher
            5: 0.85,  # Saturday
            6: 0.75   # Sunday
        }
        waste *= dow_factors.get(dow, 1.0)
        
        # Monthly pattern (month-end typically higher)
        day_of_month = record_date.day
        if day_of_month >= 28:
            waste *= 1.1
        elif day_of_month <= 3:
            waste *= 1.05
        
        # Seasonal pattern
        month = record_date.month
        if month in [4, 5, 6]:  # Summer - more waste
            waste *= 1.12
        elif month in [7, 8, 9]:  # Monsoon
            waste *= 1.05
        elif month in [10, 11]:  # Festival season
            waste *= 1.25
        elif month == 12:  # Year end
            waste *= 1.15
        
        # Commercial zones have weekly patterns
        if zone.area_type == AreaType.COMMERCIAL:
            if dow in [0, 1, 2, 3, 4]:  # Weekdays
                waste *= 1.2
            else:
                waste *= 0.6
        
        # Industrial zones are more consistent
        if zone.area_type == AreaType.INDUSTRIAL:
            if dow in [5, 6]:  # Weekend
                waste *= 0.3  # Very low
        
        # Add realistic random variation (±15%)
        variation = np.random.uniform(0.85, 1.15)
        waste *= variation
        
        # Add occasional spikes (events, holidays)
        if np.random.random() < 0.05:  # 5% chance of spike
            waste *= np.random.uniform(1.3, 1.8)
        
        return max(0, waste)
    
    async def train_model(self) -> Dict:
        """Train the XGBoost model"""
        print("Generating training data...")
        X, y = await self.generate_training_data(days=180)
        
        print(f"Training with {len(X)} samples...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train XGBoost with tuned, fast baseline parameters
        self.model = XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(
            X_train_scaled,
            y_train,
            eval_set=[(X_test_scaled, y_test)],
            verbose=False
        )
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        
        metrics = {
            "model_type": "XGBRegressor",
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "r2_score": float(r2_score(y_test, y_pred)),
            "feature_importance": dict(zip(
                ["dow", "dom", "month", "weekend", "month_start", "month_end",
                 "day_sin", "day_cos", "month_sin", "month_cos",
                 "area_type", "priority", "population", "density",
                 "frequency", "capacity", "summer", "monsoon", "festival"],
                [float(x) for x in self.model.feature_importances_]
            ))
        }
        
        # Save model
        self._save_model()
        self._save_metrics(metrics)
        
        print(f"Model trained! R² Score: {metrics['r2_score']:.3f}")
        return metrics
    
    async def predict_zone_waste(
        self, 
        zone_id: int, 
        days: int = 7, 
        start_date: Optional[date] = None
    ) -> List[Dict]:
        """Predict waste for a specific zone"""
        # Get zone
        result = await self.db.execute(select(Zone).where(Zone.id == zone_id))
        zone = result.scalar_one_or_none()
        
        if not zone:
            raise ValueError(f"Zone {zone_id} not found")
        
        # Ensure model is trained
        if self.model is None:
            print("Model not found, training now...")
            await self.train_model()
        
        predictions = []
        current_date = start_date if start_date else date.today() + timedelta(days=1)
        
        for i in range(days):
            pred_date = current_date + timedelta(days=i)
            
            # Extract features
            features = self._extract_features(pred_date, zone)
            features_scaled = self.scaler.transform(features)
            
            # Predict
            predicted_kg = float(self.model.predict(features_scaled)[0])
            
            confidence = self._get_prediction_confidence()
            
            predictions.append({
                "date": pred_date,
                "predicted_waste_kg": round(max(0, predicted_kg), 2),
                "confidence": round(confidence, 2)
            })
        
        return predictions

    def _get_prediction_confidence(self) -> float:
        """Estimate confidence using latest training metrics when available."""
        if self.metrics and self.metrics.get("r2_score") is not None:
            try:
                r2 = float(self.metrics["r2_score"])
                r2 = max(0.0, min(r2, 1.0))
                return min(0.95, max(0.70, 0.70 + (r2 * 0.25)))
            except Exception:
                pass
        return 0.78
    
    async def generate_predictions(
        self, 
        start_date: date, 
        end_date: date, 
        zone_ids: Optional[List[int]] = None
    ) -> List[WasteRecord]:
        """Generate and store predictions for zones"""
        # Get zones
        query = select(Zone).where(Zone.is_active == 1)
        if zone_ids:
            query = query.where(Zone.id.in_(zone_ids))
        
        result = await self.db.execute(query)
        zones = result.scalars().all()
        
        # Ensure model is trained
        if self.model is None:
            await self.train_model()
        
        predictions_created = []
        current_date = start_date
        
        while current_date <= end_date:
            for zone in zones:
                # Check if prediction exists
                existing = await self.db.execute(
                    select(WasteRecord).where(and_(
                        WasteRecord.zone_id == zone.id,
                        WasteRecord.date == current_date,
                        WasteRecord.is_actual == False
                    ))
                )
                if existing.scalar_one_or_none():
                    continue
                
                # Generate prediction
                features = self._extract_features(current_date, zone)
                features_scaled = self.scaler.transform(features)
                predicted_kg = float(self.model.predict(features_scaled)[0])
                
                # Create record
                record = WasteRecord(
                    zone_id=zone.id,
                    date=current_date,
                    waste_quantity_kg=max(0, predicted_kg),
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
        """Retrain model with latest data"""
        return await self.train_model()
