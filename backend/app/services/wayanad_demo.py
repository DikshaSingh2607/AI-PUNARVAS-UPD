"""
wayanad_demo.py — Wayanad 2024 Landslide Disaster Demo
======================================================
Showcases the 2024 Chooralmala-Mundakkai landslide incident (July 30, 2024).
350+ deaths, massive debris flow. Uses real coordinates and real weather data
from that period to demonstrate the system's detection capabilities.

Real coordinates:
- Chooralmala: 11.5367°N, 76.1685°E (elevation ~920m)
- Mundakkai: 11.5284°N, 76.1821°E (elevation ~1050m)  
- Vellarmala (origin): 11.54°N, 76.18°E (elevation ~1400m)
- Kalpetta (safe zone): 11.6089°N, 76.0794°E (elevation ~780m, plateau)

Historical context:
- 572mm rainfall in 48 hours preceding the disaster
- Extreme soil saturation from 2 weeks of continuous rainfall
- Steep laterite slopes (30-45°) with clay-rich subsoil
- Deforestation reduced root binding on upper slopes
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Habitation, RelocationSite, HazardEvent, RelocationPlan
from app.gis.real_data import (
    get_elevation,
    get_current_rainfall,
    get_historical_annual_rainfall,
    get_soil_moisture,
)
from app.ml.flood_model import FloodModel
from app.ml.landslide_model import LandslideModel
from app.ml.multihazard import MultiHazardFusion
from app.ml.capacity_scorer import SiteCapacityScorer

logger = logging.getLogger(__name__)

# Singletons for ML models
_flood_model = FloodModel()
_landslide_model = LandslideModel()
_fusion = MultiHazardFusion()
_capacity_scorer = SiteCapacityScorer()


# Raw Ground Truth Ground Coordinates & Baseline Hydrology for the Wayanad 2024 disaster
WAYANAD_DEMO_HABITATIONS = [
    {
        "name": "Chooralmala Village",
        "lat": 11.5367,
        "lon": 76.1685,
        "population": 820,
        "base_elevation": 920.0,
        "slope": 34.0,
        "distance_to_river": 0.35,  # 350m to Iruvazhinji river
        "soil_moisture": 88.0,
        "ndvi": 0.42,
        "rainfall_intensity": 142.0,  # 572mm/48h disaster equivalent
        "is_epicenter": True,
    },
    {
        "name": "Mundakkai Settlement",
        "lat": 11.5284,
        "lon": 76.1821,
        "population": 460,
        "base_elevation": 1050.0,
        "slope": 38.5,
        "distance_to_river": 0.45,
        "soil_moisture": 92.0,
        "ndvi": 0.38,
        "rainfall_intensity": 145.0,
        "is_epicenter": True,
    },
    {
        "name": "Vellarimala Upper Slope",
        "lat": 11.5400,
        "lon": 76.1800,
        "population": 210,
        "base_elevation": 1420.0,
        "slope": 44.0,
        "distance_to_river": 0.20,
        "soil_moisture": 94.0,
        "ndvi": 0.35,
        "rainfall_intensity": 150.0,
        "is_epicenter": True,
    },
    {
        "name": "Attamala Estate",
        "lat": 11.5320,
        "lon": 76.1750,
        "population": 360,
        "base_elevation": 1010.0,
        "slope": 33.0,
        "distance_to_river": 0.60,
        "soil_moisture": 84.0,
        "ndvi": 0.46,
        "rainfall_intensity": 135.0,
        "is_epicenter": True,
    },
    {
        "name": "Meppadi Town",
        "lat": 11.5622,
        "lon": 76.1514,
        "population": 6100,
        "base_elevation": 840.0,
        "slope": 14.0,
        "distance_to_river": 2.20,
        "soil_moisture": 68.0,
        "ndvi": 0.52,
        "rainfall_intensity": 75.0,
        "is_epicenter": False,
    },
    {
        "name": "Puthumala Colony",
        "lat": 11.5450,
        "lon": 76.1600,
        "population": 320,
        "base_elevation": 960.0,
        "slope": 31.0,
        "distance_to_river": 0.50,
        "soil_moisture": 86.0,
        "ndvi": 0.44,
        "rainfall_intensity": 138.0,
        "is_epicenter": True,
    },
    {
        "name": "Munderi Village",
        "lat": 11.5200,
        "lon": 76.1900,
        "population": 550,
        "base_elevation": 1080.0,
        "slope": 36.0,
        "distance_to_river": 0.70,
        "soil_moisture": 89.0,
        "ndvi": 0.40,
        "rainfall_intensity": 140.0,
        "is_epicenter": True,
    },
    {
        "name": "Noolpuzha",
        "lat": 11.6500,
        "lon": 76.0500,
        "population": 2500,
        "base_elevation": 750.0,
        "slope": 8.0,
        "distance_to_river": 2.80,
        "soil_moisture": 52.0,
        "ndvi": 0.58,
        "rainfall_intensity": 35.0,
        "is_epicenter": False,
    },
]

WAYANAD_DEMO_SITES = [
    {
        "name": "Kalpetta Safe Plateau",
        "district": "Wayanad",
        "state": "Kerala",
        "latitude": 11.6089,
        "longitude": 76.0794,
        "area_hectares": 35.0,
        "water_access": True,
        "road_connectivity_km": 0.5,
        "livelihood_score": 0.88,
        "land_score": 0.92,
        "infrastructure_score": 0.90,
        "overall_capacity": 2000,
        "confidence": 0.94,
        "status": "VETTED",
    },
    {
        "name": "Sulthan Bathery Transit Zone",
        "district": "Wayanad",
        "state": "Kerala",
        "latitude": 11.6645,
        "longitude": 76.2558,
        "area_hectares": 28.0,
        "water_access": True,
        "road_connectivity_km": 0.8,
        "livelihood_score": 0.82,
        "land_score": 0.86,
        "infrastructure_score": 0.85,
        "overall_capacity": 1500,
        "confidence": 0.91,
        "status": "VETTED",
    },
    {
        "name": "Mananthavady Safe Haven",
        "district": "Wayanad",
        "state": "Kerala",
        "latitude": 11.8017,
        "longitude": 76.0031,
        "area_hectares": 20.0,
        "water_access": True,
        "road_connectivity_km": 1.2,
        "livelihood_score": 0.76,
        "land_score": 0.80,
        "infrastructure_score": 0.78,
        "overall_capacity": 1000,
        "confidence": 0.87,
        "status": "PENDING",
    },
]


async def generate_wayanad_demo(db: AsyncSession) -> Dict[str, Any]:
    """
    Generate or update the comprehensive Wayanad 2024 landslide disaster scenario:
    - Creates 8 habitations around Chooralmala/Mundakkai with real geographic coordinates.
    - Queries real SRTM elevation and Open-Meteo rainfall where reachable, blending with
      historical disaster values (572mm rainfall trigger, clay soil, steep slopes).
    - Runs ML multi-hazard scoring and extracts SHAP explainability matrices.
    - Creates 3 relocation sites on safe plateaus (Kalpetta, Sulthan Bathery, Mananthavady).
    - Links the disaster event (HazardEvent) and a pre-approved RelocationPlan.
    """
    logger.info("Initializing Wayanad 2024 Disaster Demo Scenario...")

    saved_habitations: List[Habitation] = []
    affected_hab_ids: List[int] = []

    # 1. Process and Upsert Habitations
    for h_spec in WAYANAD_DEMO_HABITATIONS:
        lat = h_spec["lat"]
        lon = h_spec["lon"]
        name = h_spec["name"]

        # Fetch live/SRTM data concurrently with timeouts
        elev_task = get_elevation(lat, lon)
        annual_task = get_historical_annual_rainfall(lat, lon, year=2023)
        current_rain_task = get_current_rainfall(lat, lon)

        elev_val, annual_val, cur_rain = await asyncio.gather(
            elev_task, annual_task, current_rain_task, return_exceptions=True
        )

        # Elevation: use SRTM if valid, else known actual baseline
        if isinstance(elev_val, (int, float)) and elev_val is not None and elev_val > 100:
            elevation = float(elev_val)
        else:
            elevation = float(h_spec["base_elevation"])

        # Annual rainfall: Wayanad gets ~3200mm annual
        if isinstance(annual_val, (int, float)) and annual_val > 500:
            rainfall_annual = float(annual_val)
        else:
            rainfall_annual = 3250.0

        # Current/Disaster scenario parameters
        slope = float(h_spec["slope"])
        dist_river_km = float(h_spec["distance_to_river"])
        dist_river_m = dist_river_km * 1000.0
        soil_moisture = float(h_spec["soil_moisture"])
        ndvi = float(h_spec["ndvi"])
        rainfall_intensity = float(h_spec["rainfall_intensity"])

        # ML Features for Flood & Landslide
        flood_feat = {
            "elevation": elevation,
            "slope": slope,
            "distance_to_river": dist_river_m,
            "rainfall_annual": rainfall_annual,
            "soil_type": "clay",
            "ndvi": ndvi,
            "land_use_type": "settlement",
        }

        landslide_feat = {
            "slope_angle": slope,
            "aspect": 180.0,
            "curvature": -0.35,  # Concave drainage gully
            "soil_moisture": soil_moisture,
            "vegetation_cover": ndvi,
            "distance_to_fault": 800.0,
            "rainfall_intensity": rainfall_intensity,
        }

        flood_score = _flood_model.predict(flood_feat)
        landslide_score = _landslide_model.predict(landslide_feat)
        multihazard_score = _fusion.fuse(flood_score, landslide_score)
        priority_level = _fusion.compute_priority(multihazard_score)

        flood_shap = _flood_model.explain(flood_feat)
        landslide_shap = _landslide_model.explain(landslide_feat)
        shap_values = {"flood": flood_shap, "landslide": landslide_shap}

        # Check existing habitation
        stmt = select(Habitation).where(
            Habitation.name == name, Habitation.district == "Wayanad"
        )
        res = await db.execute(stmt)
        hab_obj = res.scalar_one_or_none()

        if not hab_obj:
            hab_obj = Habitation(
                name=name,
                district="Wayanad",
                state="Kerala",
                population=h_spec["population"],
                latitude=lat,
                longitude=lon,
                elevation=round(elevation, 1),
                slope=round(slope, 1),
                distance_to_river=round(dist_river_km, 2),
                rainfall_annual=round(rainfall_annual, 1),
                soil_type="clay",
                ndvi=round(ndvi, 2),
                land_use_type="settlement",
                slope_angle=round(slope, 1),
                soil_moisture=round(soil_moisture, 1),
                vegetation_cover=round(ndvi, 2),
                distance_to_fault=800.0,
                rainfall_intensity=round(rainfall_intensity, 2),
                flood_score=round(flood_score, 4),
                landslide_score=round(landslide_score, 4),
                multihazard_score=round(multihazard_score, 4),
                priority_level=priority_level,
                confidence=0.92,
                shap_values=shap_values,
            )
            db.add(hab_obj)
        else:
            hab_obj.population = h_spec["population"]
            hab_obj.latitude = lat
            hab_obj.longitude = lon
            hab_obj.elevation = round(elevation, 1)
            hab_obj.slope = round(slope, 1)
            hab_obj.distance_to_river = round(dist_river_km, 2)
            hab_obj.rainfall_annual = round(rainfall_annual, 1)
            hab_obj.soil_type = "clay"
            hab_obj.ndvi = round(ndvi, 2)
            hab_obj.land_use_type = "settlement"
            hab_obj.slope_angle = round(slope, 1)
            hab_obj.soil_moisture = round(soil_moisture, 1)
            hab_obj.vegetation_cover = round(ndvi, 2)
            hab_obj.distance_to_fault = 800.0
            hab_obj.rainfall_intensity = round(rainfall_intensity, 2)
            hab_obj.flood_score = round(flood_score, 4)
            hab_obj.landslide_score = round(landslide_score, 4)
            hab_obj.multihazard_score = round(multihazard_score, 4)
            hab_obj.priority_level = priority_level
            hab_obj.confidence = 0.92
            hab_obj.shap_values = shap_values

        await db.flush()
        saved_habitations.append(hab_obj)
        if h_spec.get("is_epicenter"):
            affected_hab_ids.append(hab_obj.id)

    # 2. Process and Upsert Relocation Sites
    saved_sites: List[RelocationSite] = []
    kalpetta_site = None

    for site_spec in WAYANAD_DEMO_SITES:
        stmt = select(RelocationSite).where(
            RelocationSite.name == site_spec["name"], RelocationSite.district == "Wayanad"
        )
        res = await db.execute(stmt)
        site_obj = res.scalar_one_or_none()

        site_features = {
            "area_hectares": site_spec["area_hectares"],
            "water_access": site_spec["water_access"],
            "road_connectivity_km": site_spec["road_connectivity_km"],
            "livelihood_score": site_spec["livelihood_score"],
            "land_score": site_spec["land_score"],
            "infrastructure_score": site_spec["infrastructure_score"],
        }
        shap_vals = _capacity_scorer.explain(site_features)

        if not site_obj:
            site_obj = RelocationSite(
                name=site_spec["name"],
                district=site_spec["district"],
                state=site_spec["state"],
                latitude=site_spec["latitude"],
                longitude=site_spec["longitude"],
                area_hectares=site_spec["area_hectares"],
                water_access=site_spec["water_access"],
                road_connectivity_km=site_spec["road_connectivity_km"],
                livelihood_score=site_spec["livelihood_score"],
                capacity_score=site_spec["land_score"],
                land_score=site_spec["land_score"],
                infrastructure_score=site_spec["infrastructure_score"],
                overall_capacity=site_spec["overall_capacity"],
                confidence=site_spec["confidence"],
                shap_values=shap_vals,
                status=site_spec["status"],
            )
            db.add(site_obj)
        else:
            site_obj.area_hectares = site_spec["area_hectares"]
            site_obj.water_access = site_spec["water_access"]
            site_obj.road_connectivity_km = site_spec["road_connectivity_km"]
            site_obj.livelihood_score = site_spec["livelihood_score"]
            site_obj.capacity_score = site_spec["land_score"]
            site_obj.land_score = site_spec["land_score"]
            site_obj.infrastructure_score = site_spec["infrastructure_score"]
            site_obj.overall_capacity = site_spec["overall_capacity"]
            site_obj.confidence = site_spec["confidence"]
            site_obj.shap_values = shap_vals
            site_obj.status = site_spec["status"]

        await db.flush()
        saved_sites.append(site_obj)
        if "Kalpetta" in site_obj.name:
            kalpetta_site = site_obj

    # 3. Create or Update HazardEvent for Wayanad 2024
    event_stmt = select(HazardEvent).where(
        HazardEvent.name == "Wayanad Chooralmala-Mundakkai Landslide 2024"
    )
    event_res = await db.execute(event_stmt)
    hazard_event = event_res.scalar_one_or_none()

    if not hazard_event:
        hazard_event = HazardEvent(
            name="Wayanad Chooralmala-Mundakkai Landslide 2024",
            type="LANDSLIDE",
            severity="CRITICAL",
            latitude=11.5367,
            longitude=76.1685,
            date=datetime(2024, 7, 30, 2, 0, 0),
            affected_habitations=affected_hab_ids,
        )
        db.add(hazard_event)
    else:
        hazard_event.affected_habitations = affected_hab_ids
        hazard_event.date = datetime(2024, 7, 30, 2, 0, 0)
        hazard_event.severity = "CRITICAL"

    await db.flush()

    # 4. Create Pre-Approved Relocation Plan (Chooralmala -> Kalpetta Safe Plateau)
    chooralmala = next((h for h in saved_habitations if "Chooralmala" in h.name), saved_habitations[0])
    target_site = kalpetta_site or saved_sites[0]

    plan_stmt = select(RelocationPlan).where(
        RelocationPlan.habitation_id == chooralmala.id,
        RelocationPlan.site_id == target_site.id,
    )
    plan_res = await db.execute(plan_stmt)
    plan = plan_res.scalar_one_or_none()

    if not plan:
        plan = RelocationPlan(
            habitation_id=chooralmala.id,
            site_id=target_site.id,
            officer_id=None,
            gate1_passed=True,
            gate2_passed=True,
            priority_level="IMMEDIATE",
            officer_notes=(
                "Emergency pre-approved relocation plan triggered by catastrophic debris flow "
                "event on July 30, 2024. Direct permanent resettlement from high-instability "
                "laterite slopes of Chooralmala to vetted Kalpetta Safe Plateau zone."
            ),
            status="APPROVED",
            approved_at=datetime.utcnow(),
        )
        db.add(plan)
    else:
        plan.status = "APPROVED"
        plan.gate1_passed = True
        plan.gate2_passed = True
        plan.priority_level = "IMMEDIATE"
        plan.approved_at = datetime.utcnow()
        plan.officer_notes = (
            "Emergency pre-approved relocation plan triggered by catastrophic debris flow "
            "event on July 30, 2024. Direct permanent resettlement from high-instability "
            "laterite slopes of Chooralmala to vetted Kalpetta Safe Plateau zone."
        )

    # 5. Commit all records
    await db.commit()

    logger.info("Wayanad 2024 disaster demo scenario successfully generated.")

    return {
        "event": "Wayanad 2024 Landslide Disaster (July 30, 2024)",
        "disaster_metrics": {
            "casualties": "350+",
            "rainfall_48h_mm": 572.0,
            "trigger_mechanism": "Torrential monsoon cloudburst saturating deep laterite subsoil",
            "origin_point": "Vellarimala peak debris flow channelizing into Iruvazhinji river",
            "epicenter_coordinates": {"lat": 11.5367, "lon": 76.1685},
        },
        "habitations_created": len(saved_habitations),
        "high_risk_habitations": [
            {
                "id": h.id,
                "name": h.name,
                "multihazard_score": h.multihazard_score,
                "landslide_score": h.landslide_score,
                "priority_level": h.priority_level,
                "population": h.population,
            }
            for h in saved_habitations
            if h.priority_level in ["IMMEDIATE", "HIGH"]
        ],
        "relocation_sites": [
            {
                "id": s.id,
                "name": s.name,
                "capacity": s.overall_capacity,
                "status": s.status,
                "road_connectivity_km": s.road_connectivity_km,
            }
            for s in saved_sites
        ],
        "pre_approved_plan": {
            "plan_id": plan.id,
            "source_habitation": chooralmala.name,
            "destination_site": target_site.name,
            "status": plan.status,
            "priority": plan.priority_level,
            "gate1_passed": plan.gate1_passed,
            "gate2_passed": plan.gate2_passed,
        },
        "hazard_event": {
            "id": hazard_event.id,
            "name": hazard_event.name,
            "severity": hazard_event.severity,
            "affected_habitations_count": len(affected_hab_ids),
        },
        "status": "success",
        "message": (
            "Wayanad 2024 disaster demo scenario populated with real coordinates, "
            "ML multi-hazard risk scores, SHAP explanations, and pre-approved evacuation plan."
        ),
    }
