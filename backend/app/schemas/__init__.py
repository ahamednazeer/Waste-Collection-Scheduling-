"""
Pydantic schemas for the application
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from enum import Enum


# Enums
class AreaType(str, Enum):
    RESIDENTIAL = "RESIDENTIAL"
    COMMERCIAL = "COMMERCIAL"
    INDUSTRIAL = "INDUSTRIAL"
    MIXED = "MIXED"

class PriorityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class WasteType(str, Enum):
    ORGANIC = "ORGANIC"
    RECYCLABLE = "RECYCLABLE"
    HAZARDOUS = "HAZARDOUS"
    GENERAL = "GENERAL"
    MIXED = "MIXED"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    SUPERVISOR = "SUPERVISOR"
    OPERATOR = "OPERATOR"

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Zone Schemas ---
class ZoneBase(BaseModel):
    name: str
    code: str
    area_type: AreaType = AreaType.RESIDENTIAL
    priority_level: PriorityLevel = PriorityLevel.MEDIUM
    population: Optional[int] = None
    population_density: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_waste_capacity_kg: Optional[float] = None
    default_collection_frequency: Optional[int] = 2

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    area_type: Optional[AreaType] = None
    priority_level: Optional[PriorityLevel] = None
    population: Optional[int] = None
    population_density: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_waste_capacity_kg: Optional[float] = None
    default_collection_frequency: Optional[int] = None
    is_active: Optional[bool] = None

class ZoneResponse(ZoneBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Waste Record Schemas ---
class WasteRecordBase(BaseModel):
    zone_id: int
    date: date
    waste_quantity_kg: float
    waste_type: WasteType = WasteType.MIXED
    fill_level_percent: Optional[float] = None
    is_actual: bool = True

class WasteRecordCreate(WasteRecordBase):
    pass

class WasteRecordResponse(WasteRecordBase):
    id: int
    recorded_at: datetime = Field(alias="created_at")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Vehicle Schemas ---
class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: str
    capacity_kg: float
    fuel_efficiency_km_per_liter: Optional[float] = None
    current_load_kg: float = 0
    status: str = "AVAILABLE"

class VehicleCreate(VehicleBase):
    total_km_driven: Optional[float] = None

class VehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    fuel_efficiency_km_per_liter: Optional[float] = None
    status: Optional[str] = None
    current_load_kg: Optional[float] = None
    total_km_driven: Optional[float] = None
    is_active: Optional[bool] = None

class VehicleResponse(VehicleBase):
    id: int
    total_km_driven: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Worker Schemas ---
class WorkerBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    role: str = "COLLECTOR"
    skill_level: str = "INTERMEDIATE"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: str = "OFF_DUTY"

class WorkerCreate(WorkerBase):
    pin: Optional[str] = None

class WorkerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    skill_level: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    pin: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: int
    is_active: bool
    current_week_hours: float
    current_week_assignments: int = 0
    total_assignments: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Worker Assignment Schemas ---
class WorkerAssignmentBase(BaseModel):
    schedule_id: int
    assigned_role: Optional[str] = None

class WorkerAssignmentCreate(WorkerAssignmentBase):
    pass

class WorkerAssignmentUpdate(BaseModel):
    status: Optional[str] = None
    hours_worked: Optional[float] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    waste_collected_kg: Optional[float] = None
    performance_rating: Optional[float] = None

class WorkerAssignmentResponse(BaseModel):
    id: int
    worker_id: int
    schedule_id: int
    assigned_role: str
    status: str
    hours_worked: float
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    waste_collected_kg: float
    performance_rating: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- Worker Self-Service Schemas ---
class WorkerCheckInRequest(BaseModel):
    employee_id: str
    pin: str
    schedule_id: Optional[int] = None
    schedule_code: Optional[str] = None
    zone_id: Optional[int] = None
    time_window: Optional[str] = None

class WorkerCheckOutRequest(BaseModel):
    employee_id: str
    pin: str
    schedule_id: Optional[int] = None
    schedule_code: Optional[str] = None
    zone_id: Optional[int] = None
    time_window: Optional[str] = None
    hours_worked: Optional[float] = None
    waste_collected_kg: Optional[float] = None

class WorkerAssignmentsRequest(BaseModel):
    employee_id: str
    pin: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class AutoAssignRequest(BaseModel):
    start_date: date
    end_date: date
    drivers_per_schedule: int = 1
    collectors_per_schedule: int = 2
    supervisors_per_schedule: int = 0

# --- Schedule Schemas ---
class ScheduleBase(BaseModel):
    zone_id: int
    vehicle_id: Optional[int] = None
    scheduled_date: date
    time_window: str = "MORNING"
    status: str = "PLANNED"
    priority: int = 1

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    time_window: Optional[str] = None
    status: Optional[str] = None
    actual_waste_kg: Optional[float] = None
    priority: Optional[int] = None

class ScheduleResponse(ScheduleBase):
    id: int
    expected_waste_kg: Optional[float] = None
    actual_waste_kg: Optional[float] = None
    completion_rate: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Prediction Schemas ---
class ZonePrediction(BaseModel):
    date: date
    predicted_waste_kg: float
    confidence: float

class PredictionGenerationRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    zone_ids: Optional[List[int]] = None

# --- Analytics Schemas ---
class DashboardStats(BaseModel):
    total_zones: int
    total_vehicles: int
    total_workers: int
    active_schedules: int
    completed_today: int
    total_waste_collected_kg: float
    collection_efficiency: float
    avg_route_utilization: float

class KPIMetrics(BaseModel):
    collection_efficiency: float
    route_utilization: float
    workforce_productivity: float
    on_time_completion_rate: float
    fuel_efficiency: float
    cost_per_ton: float
