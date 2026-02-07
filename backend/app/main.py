"""
Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db
from .routers import auth, zones, waste, vehicles, workforce, schedules, predictions, analytics, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    await seed_initial_data()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Driven Waste Collection Scheduling & Workforce Management System",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(waste.router)
app.include_router(vehicles.router)
app.include_router(workforce.router)
app.include_router(schedules.router)
app.include_router(predictions.router)
app.include_router(analytics.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


async def seed_initial_data():
    """Seed initial data if database is empty"""
    from .database import async_session
    from .models.user import User, UserRole
    from .models.zone import Zone, AreaType, PriorityLevel
    from .models.vehicle import Vehicle, VehicleType, VehicleStatus
    from .models.worker import Worker, WorkerRole, SkillLevel, WorkerStatus
    from .auth import get_password_hash
    from sqlalchemy import select
    
    async with async_session() as db:
        # Check if admin user exists
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            return  # Data already seeded
        
        # Create admin user
        admin = User(
            username="admin",
            email="admin@wastecollect.com",
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin)
        
        # Create supervisor user
        supervisor = User(
            username="supervisor",
            email="supervisor@wastecollect.com",
            first_name="John",
            last_name="Smith",
            role=UserRole.SUPERVISOR,
            hashed_password=get_password_hash("super123")
        )
        db.add(supervisor)
        
        # Create operator user
        operator = User(
            username="operator",
            email="operator@wastecollect.com",
            first_name="Jane",
            last_name="Doe",
            role=UserRole.OPERATOR,
            hashed_password=get_password_hash("operator123")
        )
        db.add(operator)
        
        # Create sample zones
        zones_data = [
            {"name": "Downtown Commercial", "code": "Z001", "area_type": AreaType.COMMERCIAL, "priority_level": PriorityLevel.HIGH, "population": 25000, "population_density": 5000.0, "latitude": 12.9716, "longitude": 77.5946},
            {"name": "North Residential", "code": "Z002", "area_type": AreaType.RESIDENTIAL, "priority_level": PriorityLevel.MEDIUM, "population": 50000, "population_density": 3500.0, "latitude": 12.9816, "longitude": 77.5846},
            {"name": "Industrial Park", "code": "Z003", "area_type": AreaType.INDUSTRIAL, "priority_level": PriorityLevel.HIGH, "population": 5000, "population_density": 500.0, "latitude": 12.9616, "longitude": 77.6046},
            {"name": "South Residential", "code": "Z004", "area_type": AreaType.RESIDENTIAL, "priority_level": PriorityLevel.MEDIUM, "population": 45000, "population_density": 3200.0, "latitude": 12.9516, "longitude": 77.5746},
            {"name": "East Mixed Zone", "code": "Z005", "area_type": AreaType.MIXED, "priority_level": PriorityLevel.MEDIUM, "population": 35000, "population_density": 2800.0, "latitude": 12.9716, "longitude": 77.6146},
            {"name": "West Commercial", "code": "Z006", "area_type": AreaType.COMMERCIAL, "priority_level": PriorityLevel.HIGH, "population": 20000, "population_density": 4500.0, "latitude": 12.9716, "longitude": 77.5646},
            {"name": "Central Market", "code": "Z007", "area_type": AreaType.COMMERCIAL, "priority_level": PriorityLevel.CRITICAL, "population": 15000, "population_density": 6000.0, "latitude": 12.9756, "longitude": 77.5906},
            {"name": "University Area", "code": "Z008", "area_type": AreaType.MIXED, "priority_level": PriorityLevel.MEDIUM, "population": 30000, "population_density": 3000.0, "latitude": 12.9856, "longitude": 77.5806},
            {"name": "Hospital District", "code": "Z009", "area_type": AreaType.MIXED, "priority_level": PriorityLevel.CRITICAL, "population": 10000, "population_density": 2000.0, "latitude": 12.9656, "longitude": 77.5856},
            {"name": "Suburban North", "code": "Z010", "area_type": AreaType.RESIDENTIAL, "priority_level": PriorityLevel.LOW, "population": 25000, "population_density": 1500.0, "latitude": 12.9916, "longitude": 77.5746},
        ]
        
        for z in zones_data:
            zone = Zone(**z)
            db.add(zone)
        
        # Create sample vehicles
        vehicles_data = [
            {"registration_number": "KA-01-WM-1001", "vehicle_type": VehicleType.LARGE_TRUCK, "capacity_kg": 8000.0},
            {"registration_number": "KA-01-WM-1002", "vehicle_type": VehicleType.LARGE_TRUCK, "capacity_kg": 8000.0},
            {"registration_number": "KA-01-WM-2001", "vehicle_type": VehicleType.MEDIUM_TRUCK, "capacity_kg": 5000.0},
            {"registration_number": "KA-01-WM-2002", "vehicle_type": VehicleType.MEDIUM_TRUCK, "capacity_kg": 5000.0},
            {"registration_number": "KA-01-WM-2003", "vehicle_type": VehicleType.MEDIUM_TRUCK, "capacity_kg": 5000.0},
            {"registration_number": "KA-01-WM-3001", "vehicle_type": VehicleType.SMALL_TRUCK, "capacity_kg": 3000.0},
            {"registration_number": "KA-01-WM-3002", "vehicle_type": VehicleType.SMALL_TRUCK, "capacity_kg": 3000.0},
            {"registration_number": "KA-01-WM-4001", "vehicle_type": VehicleType.COMPACTOR, "capacity_kg": 10000.0},
        ]
        
        for v in vehicles_data:
            vehicle = Vehicle(**v, status=VehicleStatus.AVAILABLE)
            db.add(vehicle)
        
        # Create sample workers
        workers_data = [
            {"employee_id": "EMP001", "first_name": "Ravi", "last_name": "Kumar", "role": WorkerRole.DRIVER, "skill_level": SkillLevel.SENIOR},
            {"employee_id": "EMP002", "first_name": "Suresh", "last_name": "Reddy", "role": WorkerRole.DRIVER, "skill_level": SkillLevel.INTERMEDIATE},
            {"employee_id": "EMP003", "first_name": "Ganesh", "last_name": "Patil", "role": WorkerRole.DRIVER, "skill_level": SkillLevel.SENIOR},
            {"employee_id": "EMP004", "first_name": "Ahmed", "last_name": "Khan", "role": WorkerRole.COLLECTOR, "skill_level": SkillLevel.INTERMEDIATE},
            {"employee_id": "EMP005", "first_name": "Prakash", "last_name": "Singh", "role": WorkerRole.COLLECTOR, "skill_level": SkillLevel.JUNIOR},
            {"employee_id": "EMP006", "first_name": "Venkat", "last_name": "Rao", "role": WorkerRole.COLLECTOR, "skill_level": SkillLevel.SENIOR},
            {"employee_id": "EMP007", "first_name": "Ramesh", "last_name": "Sharma", "role": WorkerRole.COLLECTOR, "skill_level": SkillLevel.INTERMEDIATE},
            {"employee_id": "EMP008", "first_name": "Karthik", "last_name": "Nair", "role": WorkerRole.COLLECTOR, "skill_level": SkillLevel.JUNIOR},
            {"employee_id": "EMP009", "first_name": "Arjun", "last_name": "Das", "role": WorkerRole.SUPERVISOR, "skill_level": SkillLevel.EXPERT},
            {"employee_id": "EMP010", "first_name": "Vijay", "last_name": "Menon", "role": WorkerRole.SUPERVISOR, "skill_level": SkillLevel.SENIOR},
        ]
        
        default_worker_pin = get_password_hash("1234")
        for w in workers_data:
            worker = Worker(**w, status=WorkerStatus.AVAILABLE, pin_hash=default_worker_pin)
            db.add(worker)
        
        await db.commit()
        print("✅ Initial seed data created successfully")
