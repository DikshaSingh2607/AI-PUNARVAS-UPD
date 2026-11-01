from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.security import get_current_user_optional, get_current_user
from app.models.models import Habitation, RelocationSite, Officer, AuditLog
from app.schemas.schemas import (
    HabitationResponse,
    HabitationDetailResponse,
    HabitationCreate,
    HabitationUpdate,
    HabitationStatsSummary,
    RelocationSiteResponse,
    GeoJSONFeatureCollection,
)
from app.services.scoring_service import scoring_service
from app.gis.processor import GISProcessor

router = APIRouter(prefix="/habitations", tags=["Habitations"])


@router.get("/stats/summary", response_model=HabitationStatsSummary)
async def get_habitations_stats(
    district: Optional[str] = Query(None, description="Filter by district name"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate statistics on habitations, risk distribution, and at-risk population."""
    query = select(Habitation)
    if district and district.lower() != "all":
        query = query.where(Habitation.district.ilike(district))

    result = await db.execute(query)
    habitations = result.scalars().all()

    total = len(habitations)
    if total == 0:
        return HabitationStatsSummary(
            total_habitations=0,
            immediate_count=0,
            high_count=0,
            phased_count=0,
            safe_count=0,
            avg_flood_score=0.0,
            avg_landslide_score=0.0,
            avg_multihazard_score=0.0,
            total_population_at_risk=0,
        )

    immediate_count = sum(1 for h in habitations if h.priority_level == "IMMEDIATE")
    high_count = sum(1 for h in habitations if h.priority_level == "HIGH")
    phased_count = sum(1 for h in habitations if h.priority_level == "PHASED")
    safe_count = sum(1 for h in habitations if h.priority_level == "SAFE")

    total_pop_at_risk = sum(
        h.population for h in habitations if h.priority_level in ["IMMEDIATE", "HIGH"]
    )

    avg_flood = sum(h.flood_score for h in habitations) / total
    avg_landslide = sum(h.landslide_score for h in habitations) / total
    avg_multi = sum(h.multihazard_score for h in habitations) / total

    return HabitationStatsSummary(
        total_habitations=total,
        immediate_count=immediate_count,
        high_count=high_count,
        phased_count=phased_count,
        safe_count=safe_count,
        avg_flood_score=round(avg_flood, 3),
        avg_landslide_score=round(avg_landslide, 3),
        avg_multihazard_score=round(avg_multi, 3),
        total_population_at_risk=total_pop_at_risk,
    )


@router.get("/geojson/all")
async def get_habitations_geojson(
    district: Optional[str] = Query(None, description="Filter by district"),
    priority: Optional[str] = Query(None, description="Filter by priority level"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all habitations as a GeoJSON FeatureCollection formatted for GIS maps."""
    query = select(Habitation)
    if district and district.lower() != "all":
        query = query.where(Habitation.district.ilike(district))
    if priority and priority.lower() != "all":
        query = query.where(Habitation.priority_level.ilike(priority))

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
            "confidence": h.confidence,
        }
        for h in habitations
    ]
    return GISProcessor.habitations_to_geojson(hab_dicts)


@router.get("/", response_model=List[HabitationResponse])
async def list_habitations(
    district: Optional[str] = Query(None, description="District filter"),
    priority: Optional[str] = Query(None, description="Priority classification (IMMEDIATE, HIGH, PHASED, SAFE)"),
    search: Optional[str] = Query(None, description="Search by habitation name"),
    min_score: Optional[float] = Query(None, description="Minimum multihazard score"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List habitations with comprehensive multi-criteria filtering."""
    query = select(Habitation)

    if district and district.lower() != "all":
        query = query.where(Habitation.district.ilike(f"%{district}%"))
    if priority and priority.lower() != "all":
        query = query.where(Habitation.priority_level.ilike(priority))
    if search:
        query = query.where(Habitation.name.ilike(f"%{search}%"))
    if min_score is not None:
        query = query.where(Habitation.multihazard_score >= min_score)

    query = query.order_by(Habitation.multihazard_score.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    habitations = result.scalars().all()
    return [HabitationResponse.model_validate(h) for h in habitations]


@router.get("/{id}", response_model=HabitationDetailResponse)
async def get_habitation_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed habitation assessment including SHAP breakdown and nearby candidate sites."""
    result = await db.execute(select(Habitation).where(Habitation.id == id))
    habitation = result.scalars().first()
    if not habitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Habitation with ID {id} not found",
        )

    # Reconstruct input features for on-demand explainability breakdown
    hab_features = {
        "elevation": habitation.elevation,
        "slope": habitation.slope,
        "distance_to_river": habitation.distance_to_river,
        "rainfall_annual": habitation.rainfall_annual,
        "soil_type": habitation.soil_type,
        "ndvi": habitation.ndvi,
        "land_use_type": habitation.land_use_type,
        "slope_angle": habitation.slope_angle,
        "soil_moisture": habitation.soil_moisture,
        "vegetation_cover": habitation.vegetation_cover,
        "distance_to_fault": habitation.distance_to_fault,
        "rainfall_intensity": habitation.rainfall_intensity,
    }

    # Extract primary SHAP dictionary
    shap_dict = {}
    if habitation.shap_values and isinstance(habitation.shap_values, dict):
        if "flood" in habitation.shap_values and "landslide" in habitation.shap_values:
            shap_dict = {
                **habitation.shap_values.get("flood", {}),
                **habitation.shap_values.get("landslide", {}),
            }
        else:
            shap_dict = habitation.shap_values
    else:
        # Generate fresh on demand
        f_shap = scoring_service.flood_model.explain(hab_features)
        l_shap = scoring_service.landslide_model.explain(hab_features)
        shap_dict = {**f_shap, **l_shap}

    shap_breakdown = scoring_service.explainability.format_shap_for_ui(
        shap_dict,
        feature_values=hab_features,
    )

    dominant = "flood" if habitation.flood_score >= habitation.landslide_score else "landslide"
    explanation_text = scoring_service.explainability.generate_explanation_text(
        shap_dict,
        score=habitation.multihazard_score,
        model_type=dominant,
    )

    confidence_info = scoring_service.explainability.confidence_level(
        habitation.multihazard_score,
        shap_values=shap_dict,
    )

    # Find recommended safe relocation sites in the same district or vicinity
    site_query = select(RelocationSite).where(
        RelocationSite.district.ilike(habitation.district),
        RelocationSite.status == "VETTED",
    ).order_by(RelocationSite.capacity_score.desc()).limit(4)
    site_res = await db.execute(site_query)
    sites = site_res.scalars().all()
    rec_sites = [RelocationSiteResponse.model_validate(s) for s in sites]

    response_data = HabitationDetailResponse.model_validate(habitation)
    response_data.explanation_text = explanation_text
    response_data.shap_breakdown = shap_breakdown
    response_data.confidence_info = confidence_info
    response_data.recommended_sites = rec_sites
    return response_data


@router.post("/", response_model=HabitationResponse, status_code=status.HTTP_201_CREATED)
async def create_habitation(
    hab_in: HabitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Register a new vulnerable settlement. Automatically triggers ML multi-hazard scoring."""
    hab_dict = hab_in.model_dump()

    # Run ML scoring pipeline
    scored = scoring_service.score_habitation(hab_dict)

    new_hab = Habitation(
        name=hab_in.name,
        district=hab_in.district,
        state=hab_in.state,
        population=hab_in.population,
        latitude=hab_in.latitude,
        longitude=hab_in.longitude,
        elevation=hab_in.elevation,
        slope=hab_in.slope or hab_in.slope_angle,
        distance_to_river=hab_in.distance_to_river,
        rainfall_annual=hab_in.rainfall_annual,
        soil_type=hab_in.soil_type,
        ndvi=hab_in.ndvi,
        land_use_type=hab_in.land_use_type,
        slope_angle=hab_in.slope_angle or hab_in.slope,
        soil_moisture=hab_in.soil_moisture,
        vegetation_cover=hab_in.vegetation_cover,
        distance_to_fault=hab_in.distance_to_fault,
        rainfall_intensity=hab_in.rainfall_intensity,
        flood_score=scored["flood_score"],
        landslide_score=scored["landslide_score"],
        multihazard_score=scored["multihazard_score"],
        priority_level=scored["priority_level"],
        confidence=scored["confidence"],
        shap_values=scored["shap_values"],
    )

    db.add(new_hab)
    await db.flush()

    audit = AuditLog(
        action="HABITATION_CREATED",
        entity_type="Habitation",
        entity_id=new_hab.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "name": new_hab.name,
            "district": new_hab.district,
            "multihazard_score": new_hab.multihazard_score,
            "priority": new_hab.priority_level,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_hab)

    return HabitationResponse.model_validate(new_hab)


@router.put("/{id}/rescore", response_model=HabitationDetailResponse)
async def rescore_habitation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Force re-run ML inference and SHAP explainability recalculation for a habitation."""
    result = await db.execute(select(Habitation).where(Habitation.id == id))
    hab = result.scalars().first()
    if not hab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Habitation with ID {id} not found",
        )

    hab_features = {
        "elevation": hab.elevation,
        "slope": hab.slope,
        "distance_to_river": hab.distance_to_river,
        "rainfall_annual": hab.rainfall_annual,
        "soil_type": hab.soil_type,
        "ndvi": hab.ndvi,
        "land_use_type": hab.land_use_type,
        "slope_angle": hab.slope_angle,
        "soil_moisture": hab.soil_moisture,
        "vegetation_cover": hab.vegetation_cover,
        "distance_to_fault": hab.distance_to_fault,
        "rainfall_intensity": hab.rainfall_intensity,
    }

    scored = scoring_service.score_habitation(hab_features)

    hab.flood_score = scored["flood_score"]
    hab.landslide_score = scored["landslide_score"]
    hab.multihazard_score = scored["multihazard_score"]
    hab.priority_level = scored["priority_level"]
    hab.confidence = scored["confidence"]
    hab.shap_values = scored["shap_values"]

    audit = AuditLog(
        action="HABITATION_RESCORED",
        entity_type="Habitation",
        entity_id=hab.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "name": hab.name,
            "new_multihazard_score": hab.multihazard_score,
            "new_priority": hab.priority_level,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(hab)

    return await get_habitation_detail(id=hab.id, db=db)
