from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.models import Habitation, RelocationSite, RelocationPlan, AuditLog
from app.schemas.schemas import (
    DashboardStatsResponse,
    RecentActivityItem,
    DistrictRiskSummary,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    district: Optional[str] = Query(None, description="Optional district filter"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve overarching KPIs for disaster response dashboard."""
    # Habitations query
    hab_query = select(Habitation)
    if district and district.lower() != "all":
        hab_query = hab_query.where(Habitation.district.ilike(district))

    res_hab = await db.execute(hab_query)
    habitations = res_hab.scalars().all()

    total_hab = len(habitations)
    immediate_c = sum(1 for h in habitations if h.priority_level == "IMMEDIATE")
    high_c = sum(1 for h in habitations if h.priority_level == "HIGH")
    phased_c = sum(1 for h in habitations if h.priority_level == "PHASED")
    safe_c = sum(1 for h in habitations if h.priority_level == "SAFE")
    total_at_risk = immediate_c + high_c

    avg_flood = sum(h.flood_score for h in habitations) / total_hab if total_hab > 0 else 0.0
    avg_landslide = sum(h.landslide_score for h in habitations) / total_hab if total_hab > 0 else 0.0
    avg_multi = sum(h.multihazard_score for h in habitations) / total_hab if total_hab > 0 else 0.0

    # Sites query
    site_query = select(RelocationSite)
    if district and district.lower() != "all":
        site_query = site_query.where(RelocationSite.district.ilike(district))
    res_site = await db.execute(site_query)
    sites = res_site.scalars().all()
    sites_ready = sum(1 for s in sites if s.status == "VETTED")

    # Plans query
    plan_query = select(RelocationPlan)
    res_plan = await db.execute(plan_query)
    plans = res_plan.scalars().all()

    if district and district.lower() != "all":
        plans = [p for p in plans if p.habitation and p.habitation.district.lower() == district.lower()]

    approved_count = sum(1 for p in plans if p.status == "APPROVED")
    pending_count = sum(1 for p in plans if p.status in ["DRAFT", "PENDING"])

    return DashboardStatsResponse(
        total_at_risk=total_at_risk,
        immediate_count=immediate_c,
        high_count=high_c,
        phased_count=phased_c,
        safe_count=safe_c,
        sites_ready=sites_ready,
        plans_approved=approved_count,
        plans_pending=pending_count,
        avg_flood_score=round(avg_flood, 3),
        avg_landslide_score=round(avg_landslide, 3),
        avg_multihazard_score=round(avg_multi, 3),
    )


@router.get("/recent-activity", response_model=List[RecentActivityItem])
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve chronologically sorted administrative activity log for dashboard ticker."""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [RecentActivityItem.model_validate(l) for l in logs]


@router.get("/district-summary", response_model=List[DistrictRiskSummary])
async def get_district_summary(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve district-level vulnerability and resettlement capacity breakdown."""
    hab_res = await db.execute(select(Habitation))
    habitations = hab_res.scalars().all()

    site_res = await db.execute(select(RelocationSite))
    sites = site_res.scalars().all()

    summary_map: Dict[str, Dict[str, Any]] = {}

    for h in habitations:
        d = h.district
        if d not in summary_map:
            summary_map[d] = {
                "district": d,
                "state": h.state,
                "total_habitations": 0,
                "total_population": 0,
                "critical_habitations": 0,
                "high_risk_habitations": 0,
                "scores": [],
                "available_sites_count": 0,
                "total_safe_capacity": 0,
            }

        summary_map[d]["total_habitations"] += 1
        summary_map[d]["total_population"] += h.population
        summary_map[d]["scores"].append(h.multihazard_score)

        if h.priority_level == "IMMEDIATE":
            summary_map[d]["critical_habitations"] += 1
        elif h.priority_level == "HIGH":
            summary_map[d]["high_risk_habitations"] += 1

    for s in sites:
        d = s.district
        if d in summary_map and s.status == "VETTED":
            summary_map[d]["available_sites_count"] += 1
            summary_map[d]["total_safe_capacity"] += s.overall_capacity

    results = []
    for d, data in summary_map.items():
        scores = data["scores"]
        avg_score = round(sum(scores) / len(scores), 3) if scores else 0.0
        results.append(
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

    results.sort(key=lambda x: x.critical_habitations, reverse=True)
    return results
