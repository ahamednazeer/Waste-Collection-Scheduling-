# AI-Driven Waste Collection Scheduling & Workforce Management System

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Demo Credentials
- **Admin**: admin / admin123
- **Supervisor**: supervisor / super123
- **Operator**: operator / operator123

## Overview

A 100% software-based decision-support platform for intelligent waste collection operations featuring:

- 🤖 AI-powered waste prediction (ML forecasting)
- 📅 Automated schedule generation
- 🗺️ Vehicle route optimization
- 👥 Workforce management & allocation
- 📊 Real-time analytics dashboard
- 🔐 JWT-based role-based access

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python + FastAPI + SQLite |
| Frontend | Next.js 16 + TypeScript + Tailwind |
| ML | xgboost, scikit-learn, numpy, pandas |
| Icons | Phosphor Icons |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   └── schemas/         # Pydantic schemas
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Login
│   │   └── admin/           # Dashboard pages
│   ├── components/          # Reusable components
│   └── lib/api.ts           # API client
└── README.md
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/auth/login` | JWT authentication |
| `/zones` | Zone management |
| `/waste/records` | Waste data CRUD |
| `/predictions/generate` | AI predictions |
| `/schedules/generate` | Auto-scheduling |
| `/workforce` | Worker management |
| `/analytics/dashboard` | KPIs & metrics |

## Modules

1. **Data Input** - Historical & simulated waste data
2. **Preprocessing** - Feature engineering
3. **Prediction** - ML-based waste forecasting
4. **Scheduling** - Optimal collection planning
5. **Routing** - Vehicle route optimization
6. **Workforce** - Worker assignment
7. **Monitoring** - KPIs & alerts
8. **Dashboard** - Interactive web UI
9. **Feedback Loop** - Continuous improvement
