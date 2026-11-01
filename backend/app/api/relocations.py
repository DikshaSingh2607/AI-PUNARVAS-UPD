from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    RelocationPlan,
    Habitation,
    RelocationSite,
    Officer,
    AuditLog,
    PlanStatus,
)
from app.schemas.schemas import (
    RelocationPlanResponse,
    RelocationPlanCreate,
    Gate2CheckResponse,
    RelocationPlanAuditLogResponse,
)
from app.gis.processor import GISProcessor

router = APIRouter(prefix="/relocations", tags=["Relocation & Resettlement Planning"])


@router.get("/audit-log", response_model=List[RelocationPlanAuditLogResponse])
async def get_audit_trail(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (Habitation, RelocationSite, RelocationPlan)"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve immutable audit log of administrative decisions, plan verifications, and approvals."""
    query = select(AuditLog)
    if entity_type:
        query = query.where(AuditLog.entity_type.ilike(entity_type))
    if action:
        query = query.where(AuditLog.action.ilike(action))

    query = query.order_by(desc(AuditLog.timestamp)).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [RelocationPlanAuditLogResponse.model_validate(log) for log in logs]


@router.get("/", response_model=List[RelocationPlanResponse])
async def list_relocation_plans(
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, APPROVED, REJECTED, MONITORING)"),
    district: Optional[str] = Query(None, description="Filter by habitation district"),
    db: AsyncSession = Depends(get_db),
):
    """List relocation plans with status and district filtering."""
    query = select(RelocationPlan)
    if status and status.lower() != "all":
        query = query.where(RelocationPlan.status.ilike(status))

    query = query.order_by(desc(RelocationPlan.created_at))
    result = await db.execute(query)
    plans = result.scalars().all()

    if district and district.lower() != "all":
        plans = [p for p in plans if p.habitation and p.habitation.district.lower() == district.lower()]

    return [RelocationPlanResponse.model_validate(p) for p in plans]


@router.get("/{id}", response_model=RelocationPlanResponse)
async def get_plan_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed information on a specific relocation plan."""
    result = await db.execute(select(RelocationPlan).where(RelocationPlan.id == id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation plan with ID {id} not found",
        )
    return RelocationPlanResponse.model_validate(plan)


@router.post("/", response_model=RelocationPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_relocation_plan(
    plan_in: RelocationPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """
    Initiate a new community relocation plan with automated Gate 1 eligibility screening:
    - Verifies habitation priority is IMMEDIATE or HIGH
    - Confirms destination site is officially VETTED or eligible
    """
    # Verify habitation exists
    res_hab = await db.execute(select(Habitation).where(Habitation.id == plan_in.habitation_id))
    habitation = res_hab.scalars().first()
    if not habitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Habitation with ID {plan_in.habitation_id} not found",
        )

    # Verify site exists
    res_site = await db.execute(select(RelocationSite).where(RelocationSite.id == plan_in.site_id))
    site = res_site.scalars().first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation site with ID {plan_in.site_id} not found",
        )

    # Automated Gate 1 Check
    # Community must be at severe multi-hazard risk and destination site must have capacity > 0
    is_at_risk = habitation.priority_level in ["IMMEDIATE", "HIGH"]
    site_eligible = site.overall_capacity > 0 and site.status != "REJECTED"
    gate1_passed = bool(is_at_risk and site_eligible)

    new_plan = RelocationPlan(
        habitation_id=habitation.id,
        site_id=site.id,
        officer_id=current_user.id,
        gate1_passed=gate1_passed,
        gate2_passed=False,
        priority_level=habitation.priority_level,
        officer_notes=plan_in.officer_notes or f"Initiated by {current_user.full_name}. Gate 1 verification passed={gate1_passed}.",
        status=PlanStatus.DRAFT.value,
    )

    db.add(new_plan)
    await db.flush()

    audit = AuditLog(
        action="RELOCATION_PLAN_CREATED",
        entity_type="RelocationPlan",
        entity_id=new_plan.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "habitation": habitation.name,
            "site": site.name,
            "gate1_passed": gate1_passed,
            "priority": habitation.priority_level,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_plan)

    return RelocationPlanResponse.model_validate(new_plan)


@router.post("/{id}/gate2-check", response_model=Gate2CheckResponse)
async def run_gate2_check(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """
    Execute rigorous Gate 2 Relocation Feasibility Audit:
    1. Carrying Capacity Verification: Site capacity >= Habitation population
    2. Proximity & Geographic Viability: Haversine distance <= 50 km
    3. Essential Lifelines: Potable water resource access verified
    4. Arterial Connectivity: Distance to major motorable road <= 5.0 km
    5. Livelihood Continuity: Economic compatibility score >= 0.50
    """
    result = await db.execute(select(RelocationPlan).where(RelocationPlan.id == id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation plan with ID {id} not found",
        )

    habitation = plan.habitation
    site = plan.site

    if not habitation or not site:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete plan relations",
        )

    eval_notes = []

    # 1. Capacity check
    capacity_ok = site.overall_capacity >= habitation.population
    if capacity_ok:
        eval_notes.append(
            f"Capacity Approved: Site capacity ({site.overall_capacity}) accommodates habitation population ({habitation.population})."
        )
    else:
        eval_notes.append(
            f"Capacity Warning: Site capacity ({site.overall_capacity}) is insufficient for entire population ({habitation.population}). Phased relocation or site expansion required."
        )

    # 2. Distance check
    dist_km = GISProcessor.compute_distance(
        (habitation.latitude, habitation.longitude),
        (site.latitude, site.longitude),
    )
    dist_ok = dist_km <= 50.0
    if dist_ok:
        eval_notes.append(
            f"Proximity Approved: Relocation distance is {dist_km:.1f} km, preserving socio-cultural ties within acceptable district radius."
        )
    else:
        eval_notes.append(
            f"Proximity Alert: Relocation distance is {dist_km:.1f} km, exceeding optimal 50 km threshold."
        )

    # 3. Water access
    water_ok = bool(site.water_access)
    if water_ok:
        eval_notes.append("Water Lifeline Approved: Verified municipal or spring water access at resettlement site.")
    else:
        eval_notes.append("Water Lifeline Failed: No verified potable water source. Borewell or pipeline commissioning required.")

    # 4. Road access
    road_ok = site.road_connectivity_km <= 5.0
    if road_ok:
        eval_notes.append(f"Connectivity Approved: Site is within {site.road_connectivity_km} km of primary roadway.")
    else:
        eval_notes.append(f"Connectivity Warning: Road distance is {site.road_connectivity_km} km; link road needed.")

    # 5. Livelihood compatibility
    livelihood_ok = site.livelihood_score >= 0.50
    if livelihood_ok:
        eval_notes.append(f"Livelihood Continuity Approved: Rating {site.livelihood_score:.2f} confirms viable agrarian/labor ecosystem.")
    else:
        eval_notes.append(f"Livelihood Disruption Warning: Score is {site.livelihood_score:.2f}.")

    # Gate 2 passes if capacity, water, and distance are met
    gate2_passed = bool(capacity_ok and water_ok and dist_ok)

    plan.gate2_passed = gate2_passed
    await db.flush()

    audit = AuditLog(
        action="GATE2_EVALUATED",
        entity_type="RelocationPlan",
        entity_id=plan.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "plan_id": plan.id,
            "gate2_passed": gate2_passed,
            "distance_km": dist_km,
            "capacity_sufficient": capacity_ok,
            "water_verified": water_ok,
        },
    )
    db.add(audit)
    await db.commit()

    return Gate2CheckResponse(
        plan_id=plan.id,
        habitation_id=habitation.id,
        habitation_name=habitation.name,
        habitation_population=habitation.population,
        site_id=site.id,
        site_name=site.name,
        site_capacity=site.overall_capacity,
        capacity_sufficient=capacity_ok,
        distance_km=dist_km,
        distance_acceptable=dist_ok,
        water_access_verified=water_ok,
        road_access_verified=road_ok,
        livelihood_compatibility=site.livelihood_score,
        gate2_passed=gate2_passed,
        evaluation_notes=eval_notes,
    )


@router.post("/{id}/approve", response_model=RelocationPlanResponse)
async def approve_relocation_plan(
    id: int,
    notes: Optional[str] = Body(None, embed=True, description="Officer sign-off remarks"),
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """
    Official Disaster Management Authority sign-off and approval.
    Requires Gate 1 and Gate 2 verification checks to have succeeded.
    """
    result = await db.execute(select(RelocationPlan).where(RelocationPlan.id == id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation plan with ID {id} not found",
        )

    if not plan.gate1_passed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve plan: Gate 1 hazard eligibility has not passed",
        )

    if not plan.gate2_passed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve plan: Gate 2 capacity & viability check has not passed",
        )

    plan.status = PlanStatus.APPROVED.value
    plan.approved_at = datetime.utcnow()
    plan.officer_id = current_user.id
    if notes:
        existing_notes = plan.officer_notes or ""
        plan.officer_notes = f"{existing_notes}\n[APPROVED by {current_user.full_name} on {plan.approved_at.isoformat()}]: {notes}".strip()

    audit = AuditLog(
        action="PLAN_APPROVED",
        entity_type="RelocationPlan",
        entity_id=plan.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "plan_id": plan.id,
            "habitation": plan.habitation.name if plan.habitation else None,
            "site": plan.site.name if plan.site else None,
            "approval_notes": notes,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(plan)

    return RelocationPlanResponse.model_validate(plan)


@router.post("/{id}/reject", response_model=RelocationPlanResponse)
async def reject_relocation_plan(
    id: int,
    notes: str = Body(..., embed=True, description="Reason for rejection"),
    db: AsyncSession = Depends(get_db),
    current_user: Officer = Depends(get_current_user),
):
    """Reject a proposed relocation plan with logged administrative justification."""
    result = await db.execute(select(RelocationPlan).where(RelocationPlan.id == id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relocation plan with ID {id} not found",
        )

    plan.status = PlanStatus.REJECTED.value
    existing_notes = plan.officer_notes or ""
    plan.officer_notes = f"{existing_notes}\n[REJECTED by {current_user.full_name} on {datetime.utcnow().isoformat()}]: {notes}".strip()

    audit = AuditLog(
        action="PLAN_REJECTED",
        entity_type="RelocationPlan",
        entity_id=plan.id,
        officer_id=current_user.id,
        officer_name=current_user.full_name,
        details={
            "plan_id": plan.id,
            "rejection_reason": notes,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(plan)

    return RelocationPlanResponse.model_validate(plan)
