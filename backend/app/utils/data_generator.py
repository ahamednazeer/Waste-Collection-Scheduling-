"""
Data generation utilities for simulating waste collection data
"""
import random
from datetime import date, timedelta
from typing import List
import numpy as np


def generate_waste_data(
    zone_id: int,
    start_date: date,
    end_date: date,
    base_waste_kg: float = 500.0,
    area_type: str = "RESIDENTIAL"
) -> List[dict]:
    """Generate simulated waste data for a zone"""
    data = []
    current_date = start_date
    
    # Area type multipliers
    area_multipliers = {
        "RESIDENTIAL": 1.0,
        "COMMERCIAL": 1.3,
        "INDUSTRIAL": 1.5,
        "MIXED": 1.2
    }
    base_multiplier = area_multipliers.get(area_type, 1.0)
    
    while current_date <= end_date:
        # Day of week pattern
        day_of_week = current_date.weekday()
        dow_factors = {
            0: 1.1,   # Monday - higher (weekend accumulation)
            1: 1.0,
            2: 1.0,
            3: 1.0,
            4: 1.05,  # Friday
            5: 0.9,   # Saturday
            6: 0.85   # Sunday
        }
        dow_factor = dow_factors[day_of_week]
        
        # Seasonal pattern (more waste in summer/monsoon)
        month = current_date.month
        if month in [4, 5, 6]:  # Summer
            seasonal_factor = 1.1
        elif month in [7, 8, 9]:  # Monsoon
            seasonal_factor = 1.05
        elif month in [12, 1]:  # Winter holidays
            seasonal_factor = 1.15
        else:
            seasonal_factor = 1.0
        
        # Random variation
        random_factor = random.uniform(0.85, 1.15)
        
        # Calculate waste
        waste_kg = base_waste_kg * base_multiplier * dow_factor * seasonal_factor * random_factor
        
        # Simulated fill level
        fill_level = min(100, random.uniform(40, 90))
        
        data.append({
            "zone_id": zone_id,
            "date": current_date,
            "waste_quantity_kg": round(waste_kg, 2),
            "waste_type": random.choice(["MIXED", "ORGANIC", "RECYCLABLE", "GENERAL"]),
            "fill_level_percent": round(fill_level, 1),
            "is_actual": True,
            "is_simulated": True
        })
        
        current_date += timedelta(days=1)
    
    return data


def generate_sample_csv(filename: str, days: int = 90):
    """Generate a sample CSV file with waste data"""
    import csv
    
    zones = [
        ("Z001", "COMMERCIAL", 800),
        ("Z002", "RESIDENTIAL", 500),
        ("Z003", "INDUSTRIAL", 1200),
        ("Z004", "RESIDENTIAL", 450),
        ("Z005", "MIXED", 600),
    ]
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'zone_code', 'date', 'waste_quantity_kg', 'waste_type', 'fill_level_percent'
        ])
        writer.writeheader()
        
        for zone_code, area_type, base_waste in zones:
            data = generate_waste_data(
                zone_id=0,  # Not used in CSV
                start_date=start_date,
                end_date=end_date,
                base_waste_kg=base_waste,
                area_type=area_type
            )
            for record in data:
                writer.writerow({
                    'zone_code': zone_code,
                    'date': record['date'].isoformat(),
                    'waste_quantity_kg': record['waste_quantity_kg'],
                    'waste_type': record['waste_type'],
                    'fill_level_percent': record['fill_level_percent']
                })
    
    print(f"Generated {filename} with {days * len(zones)} records")


if __name__ == "__main__":
    generate_sample_csv("sample_waste_data.csv", days=90)
