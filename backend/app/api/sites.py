from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import RelocationSite, RelocationPlan, Officer, AuditLog, SiteStatus
from app.schemas.schemas import (
    RelocationSiteResponse,
    RelocationSiteDetailResponse,
    RelocationSiteCreate,
    RelocationSiteUpdate,
    RelocationSiteCompareResponse,
)
from app.services.scoring_service import scoring_service
from app.gis.processor import GISProcessor

router = APIRouter(prefix="/sites", tags=["Relocation Sites"])


@router.get("/geojson/all")
async def get_sites_geojson(
    district: Optional[str] = Query(None, description="Filter by district"),
    status: Optional[str] = Query(None, description="Filter by status (VETTED, PENDING, REJECTED)"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all relocation sites as GeoJSON FeatureCollection."""
    query = select(RelocationSite)
    if district and district.lower() != "all":
        query = query.where(RelocationSite.district.ilike(district))
    if status and status.lower() != "all":
        query = query.where(RelocationSite.status.ilike(status))

    result = await db.execute(query)
    sites = result.scalars().all()

    site_dicts = [
        {
            "id": s.id,
            "name": s.name,
            "district": s.district,
            "state": s.state,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "area_hectares": s.area_hectares,
            "capacity_score": s.capacity_score,
            "overall_capacity": s.overall_capacity,
            "water_access": s.water_access,
            "road_connectivity_km": s.road_connectivity_km,
            "status": s.status,
        }
        for s in sites
    ]
    return GISProcessor.sites_to_geojson(site_dicts)


@router.get("/compare", response_model=RelocationSiteCompareResponse)
async def compare_sites(
    site_a: int = Query(..., description="First site ID"),
    site_b: int = Query(..., description="Second site ID"),
    db: AsyncSession = Depends(get_db),
):
    """Perform side-by-side comparative analysis between two candidate relocation sites."""
    res_a = await db.execute(select(RelocationSite).where(RelocationSite.id == site_a))
    res_b = await db.execute(select(RelocationSite).where(RelocationSite.id == site_b))
    s_a = res_a.scalars().first()
    s_b = res_b.scalars().first()

    if not s_a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site A with ID {site_a} not found",
        )
    if not s_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site B with ID {site_b} not found",
        )

    # Calculate comparative differential
    diff_capacity_score = round(s_a.capacity_score - s_b.capacity_score, 3)
    diff_area = round(s_a.area_hectares - s_b.area_hectares, 1)
    diff_capacity = s_a.overall_capacity - s_b.overall_capacity

    winner = s_a.name if s_a.capacity_score >= s_b.capacity_score else s_b.name
    superior_site = s_a if s_a.capacity_score >= s_b.capacity_score else s_b
    inferior_site = s_b if s_a.capacity_score >= s_b.capacity_score else s_a

    recommendation = (
        f"Recommendation: Select {superior_site.name} (Suitability Score: {superior_site.capacity_score:.2f}). "
        f"It offers {superior_site.overall_capacity} person capacity with "
        f"{'direct' if superior_site.water_access else 'limited'} water access and "
        f"{superior_site.road_connectivity_km}km arterial road connectivity, "
        f"outperforming {inferior_site.name} ({inferior_site.capacity_score:.2f})."
    )

    comparison_data = {
        "capacity_score_diff": diff_capacity_score,
        "area_hectares_diff": diff_area,
        "capacity_diff": diff_capacity,
        "superior_site_id": superior_site.id,
        "metrics": {
            "water_access": {"site_a": s_a.water_access, "site_b": s_b.water_access},
            "road_connectivity_km": {"site_a": s_a.road_connectivity_km, "site_b": s_b.road_connectivity_km},
            "livelihood_score": {"site_a": s_a.livelihood_score, "site_b": s_b.livelihood_score},
            "land_score": {"site_a": s_a.land_score, "site_b": s_b.land_score},
            "infrastructure_score": {"site_a": s_a.infrastructure_score, "site_b": s_b.infrastructure_score},
        },
    }

    return RelocationSiteCompareResponse(
        site_a=RelocationSiteResponse.model_validate(s_a),
        site_b=RelocationSiteResponse.model_validate(s_b),
        comparison=comparison_data,
        recommendation=recommendation,
    )


@router.get("/", response_model=List[RelocationSiteResponse])
async def list_sites(
    district: Optional[str] = Query(None, description="District filter"),
    status: Optional[str] = Query(None, description="Status filter (VETTED, PENDING, REJECTED)"),
    min_capacity: Optional[int] = Query(None, description="Minimum overall carrying capacity"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List relocation sites with multi-parameter filtering."""
    query = select(RelocationSite)
    if district and district.lower() != "all":
        query = query.where(RelocationSite.district.ilike(f"%{district}%"))
    if status and status.lower() != "all":
        query = query.where(RelocationSite.status.ilike(status))
    if min_capacity is not None:
        query = query.where(RelocationSite.overall_capacity >= min_capacity)

    query = query.order_by(RelocationSite.capacity_score.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    sites = result.scalars().all()
    return [RelocationSiteResponse.model_validate(s) for s in sites]


@router.get("/{id}", response_model=RelocationSiteDetailResponse)
async def get_site_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed site analysis with SHAP explainability and remaining capacity."""
    result = await db.execute(select(RelocationSite).where(RelocationSite.id == id))
    site = result.scalars().first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation site with ID {id} not found",
        )

    # Compute allocated population from approved plans
    plan_query = select(RelocationPlan).where(
        RelocationPlan.site_id == id,
        RelocationPlan.status.in_(["APPROVED", "MONITORING"]),
    )
    plan_res = await db.execute(plan_query)
    plans = plan_res.scalars().all()

    allocated_pop = 0
    for p in plans:
        if p.habitation:
            allocated_pop += p.habitation.population

    site_features = {
        "area_hectares": site.area_hectares,
        "water_access": site.water_access,
        "road_connectivity_km": site.road_connectivity_km,
        "livelihood_score": site.livelihood_score,
        "land_score": site.land_score,
        "infrastructure_score": site.infrastructure_score,
    }

    shap_dict = site.shap_values or scoring_service.capacity_scorer.explain(site_features)
    shap_breakdown = scoring_service.explainability.format_shap_for_ui(
        shap_dict,
        feature_values=site_features,
    )

    explanation_text = scoring_service.explainability.generate_explanation_text(
        shap_dict,
        score=site.capacity_score,
        model_type="site",
    )

    available_capacity = max(0, site.overall_capacity - allocated_pop)

    res = RelocationSiteDetailResponse.model_validate(site)
    res.explanation_text = explanation_text
    res.shap_breakdown = shap_breakdown
    res.allocated_population = allocated_pop
    res.available_capacity = available_capacity
    return res


@router.post("/", response_model=RelocationSiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site_in: RelocationSiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Register a new prospective resettlement site. Automatically calculates capacity and suitability."""
    site_dict = site_in.model_dump()
    evaluated = scoring_service.capacity_scorer.evaluate_site(site_dict)

    new_site = RelocationSite(
        name=site_in.name,
        district=site_in.district,
        state=site_in.state,
        latitude=site_in.latitude,
        longitude=site_in.longitude,
        area_hectares=site_in.area_hectares,
        water_access=site_in.water_access,
        road_connectivity_km=site_in.road_connectivity_km,
        livelihood_score=site_in.livelihood_score,
        land_score=site_in.land_score,
        infrastructure_score=site_in.infrastructure_score,
        capacity_score=evaluated["capacity_score"],
        overall_capacity=site_in.overall_capacity or evaluated["overall_capacity"],
        confidence=evaluated["confidence"],
        shap_values=evaluated["shap_values"],
        status=site_in.status or "PENDING",
    )

    db.add(new_site)
    await db.flush()

    audit = AuditLog(
        action="SITE_CREATED",
        entity_type="RelocationSite",
        entity_id=new_site.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "name": new_site.name,
            "district": new_site.district,
            "capacity_score": new_site.capacity_score,
            "overall_capacity": new_site.overall_capacity,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_site)

    return RelocationSiteResponse.model_validate(new_site)


@router.put("/{id}/status", response_model=RelocationSiteResponse)
async def update_site_status(
    id: int,
    status_update: str = Body(..., embed=True, description="New status (VETTED, PENDING, REJECTED)"),
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Update vetting status of a candidate relocation parcel."""
    norm_status = status_update.upper().strip()
    if norm_status not in ["VETTED", "PENDING", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be one of: VETTED, PENDING, REJECTED",
        )

    result = await db.execute(select(RelocationSite).where(RelocationSite.id == id))
    site = result.scalars().first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {id} not found",
        )

    old_status = site.status
    site.status = norm_status

    audit = AuditLog(
        action="SITE_STATUS_UPDATED",
        entity_type="RelocationSite",
        entity_id=site.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "site_name": site.name,
            "previous_status": old_status,
            "new_status": norm_status,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(site)

    return RelocationSiteResponse.model_validate(site)
