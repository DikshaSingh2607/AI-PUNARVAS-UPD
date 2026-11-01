from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Habitation, RelocationSite, HazardEvent, Officer, AuditLog
from app.schemas.schemas import (
    HazardEventResponse,
    HazardEventCreate,
    DistrictRiskSummary,
)
from app.gis.processor import GISProcessor

router = APIRouter(prefix="/hazards", tags=["Hazard & Risk Intelligence"])


@router.get("/redzone-map")
async def get_redzone_map(
    district: Optional[str] = Query(None, description="Filter by district"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate GeoJSON FeatureCollection of risk zones (buffers around settlements).
    Polygons are color-coded and sized according to multi-hazard susceptibility.
    """
    query = select(Habitation)
    if district and district.lower() != "all":
        query = query.where(Habitation.district.ilike(district))

    result = await db.execute(query)
    habitations = result.scalars().all()

    hab_dicts = [
        {
            "id": h.id,
            "name": h.name,
            "district": h.district,
            "state": h.state,
            "population": h.population,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "flood_score": h.flood_score,
            "landslide_score": h.landslide_score,
            "multihazard_score": h.multihazard_score,
            "priority_level": h.priority_level,
        }
        for h in habitations
    ]
    return GISProcessor.generate_risk_polygons(hab_dicts)


@router.get("/events", response_model=List[HazardEventResponse])
async def list_hazard_events(
    type: Optional[str] = Query(None, description="Event type: FLOOD, LANDSLIDE, CYCLONE"),
    severity: Optional[str] = Query(None, description="Severity: LOW, MED, HIGH, CRITICAL"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve logged disaster and hazard events."""
    query = select(HazardEvent)
    if type and type.lower() != "all":
        query = query.where(HazardEvent.type.ilike(type))
    if severity and severity.lower() != "all":
        query = query.where(HazardEvent.severity.ilike(severity))

    query = query.order_by(HazardEvent.date.desc()).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()
    return [HazardEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=HazardEventResponse, status_code=status.HTTP_201_CREATED)
async def create_hazard_event(
    event_in: HazardEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Log an active or historical hazard event."""
    new_event = HazardEvent(
        name=event_in.name,
        type=event_in.type.upper(),
        severity=event_in.severity.upper(),
        latitude=event_in.latitude,
        longitude=event_in.longitude,
        date=event_in.date,
        affected_habitations=event_in.affected_habitations or [],
    )
    db.add(new_event)
    await db.flush()

    audit = AuditLog(
        action="HAZARD_EVENT_LOGGED",
        entity_type="HazardEvent",
        entity_id=new_event.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "name": new_event.name,
            "type": new_event.type,
            "severity": new_event.severity,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_event)

    return HazardEventResponse.model_validate(new_event)


@router.get("/risk-summary", response_model=List[DistrictRiskSummary])
async def get_risk_summary(
    db: AsyncSession = Depends(get_db),
):
    """Aggregate multi-hazard vulnerability indices and capacity metrics per district."""
    # Fetch all habitations and sites
    hab_res = await db.execute(select(Habitation))
    habitations = hab_res.scalars().all()

    site_res = await db.execute(select(RelocationSite))
    sites = site_res.scalars().all()

    district_map: Dict[str, Dict[str, Any]] = {}

    for h in habitations:
        d = h.district
        if d not in district_map:
            district_map[d] = {
                "district": d,
                "state": h.state,
                "total_habitations": 0,
                "total_population": 0,
                "critical_habitations": 0,
                "high_risk_habitations": 0,
                "multihazard_scores": [],
                "available_sites_count": 0,
                "total_safe_capacity": 0,
            }

        district_map[d]["total_habitations"] += 1
        district_map[d]["total_population"] += h.population
        district_map[d]["multihazard_scores"].append(h.multihazard_score)

        if h.priority_level == "IMMEDIATE":
            district_map[d]["critical_habitations"] += 1
        elif h.priority_level == "HIGH":
            district_map[d]["high_risk_habitations"] += 1

    for s in sites:
        d = s.district
        if d in district_map:
            if s.status == "VETTED":
                district_map[d]["available_sites_count"] += 1
                district_map[d]["total_safe_capacity"] += s.overall_capacity

    summaries = []
    for d, data in district_map.items():
        scores = data["multihazard_scores"]
        avg_score = round(sum(scores) / len(scores), 3) if scores else 0.0
        summaries.append(
            DistrictRiskSummary(
                district=data["district"],
                state=data["state"],
                total_habitations=data["total_habitations"],
                total_population=data["total_population"],
                critical_habitations=data["critical_habitations"],
                high_risk_habitations=data["high_risk_habitations"],
                avg_multihazard_score=avg_score,
                available_sites_count=data["available_sites_count"],
                total_safe_capacity=data["total_safe_capacity"],
            )
        )

    summaries.sort(key=lambda x: x.critical_habitations + x.high_risk_habitations, reverse=True)
    return summaries


@router.get("/layers/{layer_type}")
async def get_hazard_layer(
    layer_type: str,
    district: Optional[str] = Query(None, description="District filter"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve single-hazard spatial map layer (flood or landslide).
    Formats points with specific hazard scoring, contours, and color styling.
    """
    l_type = layer_type.lower().strip()
    if l_type not in ["flood", "landslide"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="layer_type must be either 'flood' or 'landslide'",
        )

    query = select(Habitation)
    if district and district.lower() != "all":
        query = query.where(Habitation.district.ilike(district))

    result = await db.execute(query)
    habitations = result.scalars().all()

    features = []
    for h in habitations:
        score = h.flood_score if l_type == "flood" else h.landslide_score

        # Color ramp: Green -> Yellow -> Orange -> Crimson
        if score >= 0.75:
            color = "#b91c1c"
            intensity = "Extreme"
        elif score >= 0.55:
            color = "#ea580c"
            intensity = "High"
        elif score >= 0.35:
            color = "#eab308"
            intensity = "Moderate"
        else:
            color = "#15803d"
            intensity = "Low"

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(h.longitude), float(h.latitude)],
            },
            "properties": {
                "habitation_id": h.id,
                "name": h.name,
                "district": h.district,
                "hazard_type": l_type.upper(),
                "score": score,
                "intensity": intensity,
                "color": color,
                "elevation": h.elevation,
                "slope": h.slope,
            },
        })

    return {
        "type": "FeatureCollection",
        "properties": {
            "layer": f"{l_type.upper()}_SUSCEPTIBILITY",
            "count": len(features),
        },
        "features": features,
    }
