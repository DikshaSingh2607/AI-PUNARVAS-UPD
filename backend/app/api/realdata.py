"""
app/api/realdata.py — Real Data Enrichment Endpoints
=====================================================
Endpoints that fetch live data from open APIs (SRTM, Open-Meteo, OSM)
and optionally trigger ML re-scoring with real features.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Officer, Habitation, RelocationSite, RelocationPlan, HazardEvent
from app.gis.real_data import (
    enrich_habitation_with_real_data,
    enrich_site_with_real_data,
    get_current_rainfall,
    get_elevation,
    get_earthquakes_near,
    get_infrastructure_near,
    geocode_place,
)
from app.ml.flood_model import FloodModel
from app.ml.landslide_model import LandslideModel
from app.ml.multihazard import MultiHazardFusion

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/realdata", tags=["Real Data"])

flood_model = FloodModel()
landslide_model = LandslideModel()
fusion = MultiHazardFusion()


@router.get("/elevation")
async def fetch_elevation(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: Officer = Depends(get_current_user),
):
    """Fetch real SRTM elevation for a coordinate."""
    elevation = await get_elevation(lat, lon)
    if elevation is None:
        raise HTTPException(status_code=503, detail="Elevation data unavailable")
    return {"lat": lat, "lon": lon, "elevation_m": elevation, "source": "OpenTopoData SRTM30m"}


@router.get("/rainfall")
async def fetch_rainfall(
    lat: float = Query(...),
    lon: float = Query(...),
    current_user: Officer = Depends(get_current_user),
):
    """Fetch current 7-day rainfall forecast from Open-Meteo (IMD-based)."""
    data = await get_current_rainfall(lat, lon)
    return {**data, "source": "Open-Meteo (IMD grid)", "lat": lat, "lon": lon}


@router.get("/earthquakes")
async def fetch_earthquakes(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(200.0, description="Search radius in km"),
    min_magnitude: float = Query(4.0),
    current_user: Officer = Depends(get_current_user),
):
    """Fetch recent earthquakes near a location from USGS."""
    quakes = await get_earthquakes_near(lat, lon, radius_km, min_magnitude)
    return {
        "count": len(quakes),
        "earthquakes": quakes,
        "source": "USGS Earthquake Hazards Program",
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
    }


@router.get("/infrastructure")
async def fetch_infrastructure(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_m: int = Query(5000, description="Radius in metres"),
    current_user: Officer = Depends(get_current_user),
):
    """Fetch nearby infrastructure counts from OpenStreetMap Overpass API."""
    infra = await get_infrastructure_near(lat, lon, radius_m)
    return {**infra, "source": "OpenStreetMap Overpass API", "lat": lat, "lon": lon, "radius_m": radius_m}


@router.get("/geocode")
async def geocode_location(
    place: str = Query(..., description="Place name to geocode"),
    district: str = Query("", description="District name"),
    current_user: Officer = Depends(get_current_user),
):
    """Geocode an Indian place name to lat/lon using OSM Nominatim."""
    result = await geocode_place(place, district)
    if not result:
        raise HTTPException(status_code=404, detail=f"Could not geocode '{place}'")
    return {**result, "source": "OpenStreetMap Nominatim"}


@router.post("/habitations/{habitation_id}/enrich")
async def enrich_habitation(
    habitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """
    Fetch real-world data for a habitation and re-score it with live features.
    Updates the habitation's scores in the database.
    """
    # Fetch habitation
    result = await db.execute(select(Habitation).where(Habitation.id == habitation_id))
    hab = result.scalar_one_or_none()
    if not hab:
        raise HTTPException(status_code=404, detail="Habitation not found")

    # Fetch real data
    real_features = await enrich_habitation_with_real_data(hab.latitude, hab.longitude)

    # Build feature vectors for ML models
    flood_features = {
        "elevation": real_features["elevation_m"],
        "slope": hab.slope or 15.0,
        "distance_to_river": hab.distance_to_river or 2.0,
        "rainfall_annual": real_features["annual_rainfall_mm"],
        "soil_type": hab.soil_type or 2.0,
        "ndvi": hab.ndvi or 0.4,
        "land_use_type": hab.land_use_type or 3.0,
    }
    landslide_features = {
        "slope_angle": hab.slope_angle or 25.0,
        "aspect": 180.0,
        "curvature": 0.2,
        "soil_moisture": real_features["soil_moisture_index"],
        "vegetation_cover": hab.vegetation_cover or 0.5,
        "distance_to_fault": hab.distance_to_fault or 30.0,
        "rainfall_intensity": real_features["current_7day_rain_mm"] / 7.0,
    }

    # Re-score with real data
    new_flood_score = flood_model.predict(flood_features)
    new_landslide_score = landslide_model.predict(landslide_features)
    fused = fusion.fuse(new_flood_score, new_landslide_score)
    new_priority = fusion.compute_priority(fused)

    flood_shap = flood_model.explain(flood_features)
    landslide_shap = landslide_model.explain(landslide_features)

    # Update in DB
    hab.flood_score = round(new_flood_score, 4)
    hab.landslide_score = round(new_landslide_score, 4)
    hab.multihazard_score = round(fused, 4)
    hab.priority_level = new_priority
    hab.shap_values = {"flood": flood_shap, "landslide": landslide_shap}
    await db.commit()
    await db.refresh(hab)

    return {
        "habitation_id": habitation_id,
        "name": hab.name,
        "real_features_used": real_features,
        "new_scores": {
            "flood_score": hab.flood_score,
            "landslide_score": hab.landslide_score,
            "multihazard_score": hab.multihazard_score,
            "priority_level": hab.priority_level,
        },
        "data_sources": [
            "OpenTopoData SRTM30m (elevation)",
            "Open-Meteo archive (rainfall)",
            "Open-Meteo forecast (soil moisture)",
        ],
        "message": "Habitation re-scored with live real-world data",
    }


@router.post("/sites/{site_id}/enrich")
async def enrich_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """
    Fetch real infrastructure & elevation data for a relocation site and update its record.
    """
    result = await db.execute(select(RelocationSite).where(RelocationSite.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")

    real_features = await enrich_site_with_real_data(site.latitude, site.longitude)

    # Update real fields in DB
    if real_features.get("road_connectivity_km"):
        site.road_connectivity_km = real_features["road_connectivity_km"]
    if real_features.get("has_water_nearby") is not None:
        site.water_access = real_features["has_water_nearby"]

    await db.commit()

    return {
        "site_id": site_id,
        "name": site.name,
        "real_features": real_features,
        "updated_fields": {
            "road_connectivity_km": site.road_connectivity_km,
            "water_access": site.water_access,
        },
        "data_sources": [
            "OpenTopoData SRTM30m (elevation)",
            "OpenStreetMap Overpass (roads, infrastructure)",
            "Open-Meteo (rainfall forecast)",
        ],
        "message": "Site updated with real-world data",
    }


@router.get("/live-risk-snapshot")
async def live_risk_snapshot(
    lat: float = Query(..., description="Latitude of area of interest"),
    lon: float = Query(..., description="Longitude of area of interest"),
    current_user: Officer = Depends(get_current_user),
):
    """
    Full live risk snapshot for any coordinate:
    elevation + rainfall + soil moisture + earthquakes — all real data.
    """
    import asyncio
    from app.gis.real_data import (
        get_elevation,
        get_current_rainfall,
        get_soil_moisture,
        get_earthquakes_near,
    )

    elevation, rainfall, soil_moisture, earthquakes = await asyncio.gather(
        get_elevation(lat, lon),
        get_current_rainfall(lat, lon),
        __import__('app.gis.real_data', fromlist=['get_soil_moisture']).get_soil_moisture(lat, lon),
        get_earthquakes_near(lat, lon, radius_km=150),
        return_exceptions=True,
    )

    return {
        "coordinates": {"lat": lat, "lon": lon},
        "elevation_m": elevation if not isinstance(elevation, Exception) else None,
        "rainfall": rainfall if not isinstance(rainfall, Exception) else {},
        "soil_moisture_index": soil_moisture if not isinstance(soil_moisture, Exception) else None,
        "recent_earthquakes_150km": earthquakes if not isinstance(earthquakes, list) else earthquakes,
        "data_sources": {
            "elevation": "OpenTopoData (SRTM 30m)",
            "rainfall": "Open-Meteo (IMD-based forecast)",
            "soil_moisture": "Open-Meteo soil model",
            "earthquakes": "USGS Earthquake Hazards Program",
        },
    }


# ─────────────────────────────────────────────────────────
# FIFO BUFFER MANAGEMENT
# ─────────────────────────────────────────────────────────
async def enforce_buffer_limit(db: AsyncSession, max_records: int = 200) -> Dict[str, Any]:
    """
    Delete oldest habitation records that exceed the buffer limit.
    Protect records that have APPROVED relocation plans.
    """
    total = await db.scalar(select(func.count(Habitation.id)))
    if total is None or total <= max_records:
        return {"deleted": 0, "remaining": total or 0}

    excess = total - max_records

    # Get IDs of habitations with approved plans (protected from deletion)
    protected_subq = select(RelocationPlan.habitation_id).where(
        RelocationPlan.status == "APPROVED"
    )

    # Get oldest excess records that are NOT protected
    oldest = await db.execute(
        select(Habitation.id)
        .where(Habitation.id.notin_(protected_subq))
        .order_by(Habitation.created_at.asc())
        .limit(excess)
    )
    ids_to_delete = [row[0] for row in oldest.fetchall()]

    if ids_to_delete:
        await db.execute(
            delete(Habitation).where(Habitation.id.in_(ids_to_delete))
        )
        await db.commit()

    remaining = await db.scalar(select(func.count(Habitation.id))) or 0
    return {"deleted": len(ids_to_delete), "remaining": remaining}


# ─────────────────────────────────────────────────────────
# NEW REAL DATA PIPELINE & ADVISORY ENDPOINTS
# ─────────────────────────────────────────────────────────
@router.post("/ingest-district")
async def ingest_district_endpoint(
    district: str = Query(..., description="District name (e.g. Wayanad, Chamoli, Rudraprayag, Idukki, Uttarkashi)"),
    limit: int = Query(40, ge=1, le=100, description="Max villages to ingest"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Officer] = Depends(get_current_user_optional),
):
    """
    Fetch real villages via OSM Overpass, enrich with SRTM elevation and Open-Meteo rainfall,
    score using ML multi-hazard models, insert into DB, and enforce 200-record FIFO buffer.
    """
    from app.gis.open_data_pipeline import ingest_district as run_ingest_district

    enriched_villages = await run_ingest_district(district=district, limit=limit)
    if not enriched_villages:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to ingest villages for district '{district}'. Please check network connectivity.",
        )

    inserted_or_updated: List[Habitation] = []

    for v_data in enriched_villages:
        stmt = select(Habitation).where(
            Habitation.name == v_data["name"],
            Habitation.district == district,
        )
        res = await db.execute(stmt)
        hab = res.scalar_one_or_none()

        if not hab:
            hab = Habitation(**v_data)
            db.add(hab)
        else:
            for k, val in v_data.items():
                if hasattr(hab, k):
                    setattr(hab, k, val)

        await db.flush()
        inserted_or_updated.append(hab)

    await db.commit()

    # Enforce 200 record FIFO buffer limit
    buffer_status = await enforce_buffer_limit(db, max_records=200)

    hab_summaries = [
        {
            "id": h.id,
            "name": h.name,
            "district": h.district,
            "state": h.state,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "elevation": h.elevation,
            "multihazard_score": h.multihazard_score,
            "flood_score": h.flood_score,
            "landslide_score": h.landslide_score,
            "priority_level": h.priority_level,
            "population": h.population,
        }
        for h in inserted_or_updated
    ]

    return {
        "ingested_count": len(inserted_or_updated),
        "total_records": buffer_status["remaining"],
        "buffer_status": buffer_status,
        "habitations": hab_summaries,
    }


@router.get("/critical-advisories")
async def get_critical_advisories(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Officer] = Depends(get_current_user_optional),
):
    """
    Scan all high-risk habitations against live rainfall and generate active evacuation advisories.
    """
    from app.services.advisory_engine import AdvisoryEngine

    engine = AdvisoryEngine()
    advisories = await engine.scan_all_habitations(db)
    return {
        "count": len(advisories),
        "advisories": advisories,
        "scanned_at": datetime.utcnow().isoformat(),
    }


@router.get("/buffer-status")
async def get_buffer_status(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Officer] = Depends(get_current_user_optional),
):
    """
    Get current occupancy status of the 200-record FIFO buffer.
    """
    total = await db.scalar(select(func.count(Habitation.id))) or 0
    oldest = await db.scalar(select(func.min(Habitation.created_at)))
    newest = await db.scalar(select(func.max(Habitation.created_at)))

    district_rows = await db.execute(
        select(Habitation.district, func.count(Habitation.id)).group_by(Habitation.district)
    )
    by_district = {row[0]: row[1] for row in district_rows.fetchall()}

    return {
        "current_count": total,
        "max_buffer": 200,
        "oldest_record_date": oldest.isoformat() if oldest else None,
        "newest_record_date": newest.isoformat() if newest else None,
        "by_district": by_district,
    }


@router.post("/wayanad-demo")
async def post_wayanad_demo(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Officer] = Depends(get_current_user_optional),
):
    """
    Populate or reset the Wayanad 2024 landslide disaster scenario with real coordinates,
    real SRTM elevation, ML models scoring, and pre-approved evacuation relocation plans.
    """
    from app.services.wayanad_demo import generate_wayanad_demo

    demo_result = await generate_wayanad_demo(db)
    return demo_result


@router.post("/enforce-buffer")
async def post_enforce_buffer(
    max_records: int = Query(200, ge=10, le=1000, description="Buffer capacity ceiling"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Officer] = Depends(get_current_user_optional),
):
    """
    Manually trigger FIFO buffer enforcement to prune oldest unprotected habitations.
    """
    result = await enforce_buffer_limit(db, max_records=max_records)
    return {
        "deleted_count": result["deleted"],
        "remaining_count": result["remaining"],
        "max_buffer": max_records,
    }

