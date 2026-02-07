"""
Scheduling Service - Collection schedule generation
"""
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models.zone import Zone, PriorityLevel
from ..models.vehicle import Vehicle, VehicleStatus
from ..models.schedule import Schedule, ScheduleStatus, TimeWindow
from ..models.waste_record import WasteRecord
from .advanced_prediction_service import AdvancedPredictionService


class SchedulingService:
    """Service for generating and managing collection schedules"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.prediction_service = AdvancedPredictionService(db)
    
    async def generate_schedules(
        self, 
        start_date: date, 
        end_date: date,
        zone_ids: Optional[List[int]] = None
    ) -> List[Schedule]:
        """Generate optimal collection schedules based on predictions"""
        from sqlalchemy import delete
        
        # Clear existing PLANNED schedules in range to allow regeneration
        # This fixes issues where old/inaccurate schedules persist
        delete_query = delete(Schedule).where(and_(
            Schedule.scheduled_date >= start_date,
            Schedule.scheduled_date <= end_date,
            Schedule.status == ScheduleStatus.PLANNED
        ))
        if zone_ids:
            delete_query = delete_query.where(Schedule.zone_id.in_(zone_ids))
        
        await self.db.execute(delete_query)
        
        # Get active zones
        query = select(Zone).where(Zone.is_active == 1)
        if zone_ids:
            query = query.where(Zone.id.in_(zone_ids))
        query = query.order_by(Zone.priority_level.desc())
        
        result = await self.db.execute(query)
        zones = result.scalars().all()
        
        # Get available vehicles
        result = await self.db.execute(
            select(Vehicle).where(and_(
                Vehicle.is_active == True,
                Vehicle.status == VehicleStatus.AVAILABLE
            ))
        )
        vehicles = result.scalars().all()
        
        schedules_created = []
        current_date = start_date
        
        while current_date <= end_date:
            # Skip weekends logic can be added here if needed
            day_schedules = await self._generate_day_schedules(
                current_date, zones, vehicles
            )
            schedules_created.extend(day_schedules)
            
            current_date += timedelta(days=1)
        
        await self.db.commit()
        return schedules_created
    
    async def _generate_day_schedules(
        self, 
        schedule_date: date,
        zones: List[Zone],
        vehicles: List[Vehicle]
    ) -> List[Schedule]:
        """Generate schedules for a single day"""
        schedules = []
        vehicle_assignments = {}  # Track vehicle usage per time window
        
        for zone in zones:
            # Check if zone needs collection on this day
            if not self._should_collect(zone, schedule_date):
                continue
            
            # Calculate waste accumulation based on frequency
            # e.g., Frequency 2 (every 3.5 days) -> Accumulate last 3-4 days
            freq = zone.default_collection_frequency or 1
            days_accumulation = max(1, round(7 / freq))
            
            # Predict for the days LEADING UP TO this collection
            # Start date = schedule_date - (days_accumulation - 1) day
            pred_start = schedule_date - timedelta(days=days_accumulation - 1)
            
            predictions = await self.prediction_service.predict_zone_waste(
                zone.id, 
                days=days_accumulation,
                start_date=pred_start
            )
            
            # Expected waste is the SUM of daily generation since last collection
            expected_waste = sum(p["predicted_waste_kg"] for p in predictions)
            
            # Determine time window based on priority
            time_window = self._determine_time_window(zone, schedule_date)
            
            # Find available vehicle
            vehicle = self._find_available_vehicle(
                vehicles, expected_waste, time_window, vehicle_assignments
            )
            
            # Create schedule
            schedule = Schedule(
                zone_id=zone.id,
                vehicle_id=vehicle.id if vehicle else None,
                scheduled_date=schedule_date,
                time_window=time_window,
                expected_waste_kg=expected_waste,
                priority=self._get_priority_value(zone.priority_level),
                status=ScheduleStatus.PLANNED
            )
            self.db.add(schedule)
            schedules.append(schedule)
            
            # Update vehicle assignment tracking
            if vehicle:
                key = (vehicle.id, time_window)
                vehicle_assignments[key] = vehicle_assignments.get(key, 0) + expected_waste
        
        return schedules
    
    def _should_collect(self, zone: Zone, check_date: date) -> bool:
        """Determine if zone should be collected on given date"""
        frequency = zone.default_collection_frequency
        day_of_week = check_date.weekday()
        
        if frequency >= 7:
            return True  # Daily collection
        elif frequency >= 3:
            # Monday, Wednesday, Friday
            return day_of_week in [0, 2, 4]
        elif frequency >= 2:
            # Monday and Thursday
            return day_of_week in [0, 3]
        else:
            # Weekly - Monday only
            return day_of_week == 0
    
    def _determine_time_window(self, zone: Zone, schedule_date: date) -> TimeWindow:
        """Determine optimal time window for collection"""
        # High priority zones get early morning slots
        if zone.priority_level == PriorityLevel.CRITICAL:
            return TimeWindow.EARLY_MORNING
        elif zone.priority_level == PriorityLevel.HIGH:
            return TimeWindow.MORNING
        elif zone.area_type.value == "COMMERCIAL":
            # Commercial areas collected early to avoid business hours
            return TimeWindow.EARLY_MORNING
        elif zone.area_type.value == "RESIDENTIAL":
            return TimeWindow.MORNING
        else:
            return TimeWindow.AFTERNOON
    
    def _find_available_vehicle(
        self,
        vehicles: List[Vehicle],
        required_capacity: float,
        time_window: TimeWindow,
        assignments: dict
    ) -> Optional[Vehicle]:
        """Find an available vehicle with sufficient capacity"""
        for vehicle in vehicles:
            key = (vehicle.id, time_window)
            current_load = assignments.get(key, 0)
            
            # Check if vehicle has capacity for this collection
            if current_load + required_capacity <= vehicle.capacity_kg:
                return vehicle
        
        # If no vehicle has full capacity, find one with most available
        best_vehicle = None
        best_available = 0
        
        for vehicle in vehicles:
            key = (vehicle.id, time_window)
            current_load = assignments.get(key, 0)
            available = vehicle.capacity_kg - current_load
            
            if available > best_available:
                best_available = available
                best_vehicle = vehicle
        
        return best_vehicle
    
    def _get_priority_value(self, priority_level: PriorityLevel) -> int:
        """Convert priority level to numeric value"""
        priority_map = {
            PriorityLevel.CRITICAL: 5,
            PriorityLevel.HIGH: 4,
            PriorityLevel.MEDIUM: 3,
            PriorityLevel.LOW: 2
        }
        return priority_map.get(priority_level, 3)
