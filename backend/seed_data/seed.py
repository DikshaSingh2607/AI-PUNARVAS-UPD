import asyncio
import logging
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    Officer,
    Habitation,
    RelocationSite,
    RelocationPlan,
    HazardEvent,
    AuditLog,
    OfficerRole,
    PlanStatus,
)
from app.gis.data_loader import DataLoader
from app.services.scoring_service import scoring_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


async def seed_database(db: AsyncSession):
    """
    Populate database with complete production-grade baseline data:
    - 3 Officer accounts (admin, wayanad officer, chamoli officer)
    - 50 Habitations across 5 high-risk districts (ML scored with SHAP)
    - 20 Candidate Relocation Sites (Capacity scored)
    - 5 Historical Hazard Events
    - 3 Gated Relocation Plans (1 Approved, 1 In-Review, 1 Rejected)
    - Audit Trail Records
    """
    logger.info("Checking existing database contents...")

    # Check if officers already exist
    existing_officers = await db.execute(select(Officer))
    if existing_officers.scalars().first():
        logger.info("Database already seeded. Skipping seed execution.")
        return

    logger.info("Seeding database tables...")

    # 1. Seed Officers
    officers = [
        Officer(
            username="admin",
            full_name="State Relief Commissioner Admin",
            email="admin@punarvas.gov.in",
            hashed_password=get_password_hash("admin123"),
            district="All",
            role=OfficerRole.ADMIN.value,
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=60),
        ),
        Officer(
            username="officer1",
            full_name="Dr. Anita Menon (Wayanad District Collector)",
            email="anita.menon@kerala.gov.in",
            hashed_password=get_password_hash("pass123"),
            district="Wayanad",
            role=OfficerRole.COLLECTOR.value,
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=45),
        ),
        Officer(
            username="officer2",
            full_name="Rajesh Sharma (Chamoli SDM Disaster)",
            email="sharma.chamoli@uk.gov.in",
            hashed_password=get_password_hash("pass123"),
            district="Chamoli",
            role=OfficerRole.OFFICER.value,
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=30),
        ),
    ]
    db.add_all(officers)
    await db.flush()
    logger.info("Officers seeded: admin, officer1, officer2.")

    # 2. Load and Score Habitations
    raw_data = DataLoader.load_synthetic_data()
    raw_habitations = raw_data["habitations"]
    raw_sites = raw_data["sites"]
    raw_events = raw_data["hazard_events"]

    db_habitations = []
    logger.info(f"Processing and ML-scoring {len(raw_habitations)} habitations...")
    for h in raw_habitations:
        hab_dict = {
            "elevation": h["elevation"],
            "slope": h["slope"],
            "distance_to_river": h["distance_to_river"],
            "rainfall_annual": h["rainfall_annual"],
            "soil_type": h["soil_type"],
            "ndvi": h["ndvi"],
            "land_use_type": h["land_use_type"],
            "slope_angle": h["slope_angle"],
            "soil_moisture": h["soil_moisture"],
            "vegetation_cover": h["vegetation_cover"],
            "distance_to_fault": h["distance_to_fault"],
            "rainfall_intensity": h["rainfall_intensity"],
        }
        scored = scoring_service.score_habitation(hab_dict)

        hab_obj = Habitation(
            id=h["id"],
            name=h["name"],
            district=h["district"],
            state=h["state"],
            population=h["population"],
            latitude=h["latitude"],
            longitude=h["longitude"],
            elevation=h["elevation"],
            slope=h["slope"],
            distance_to_river=h["distance_to_river"],
            rainfall_annual=h["rainfall_annual"],
            soil_type=h["soil_type"],
            ndvi=h["ndvi"],
            land_use_type=h["land_use_type"],
            slope_angle=h["slope_angle"],
            soil_moisture=h["soil_moisture"],
            vegetation_cover=h["vegetation_cover"],
            distance_to_fault=h["distance_to_fault"],
            rainfall_intensity=h["rainfall_intensity"],
            flood_score=scored["flood_score"],
            landslide_score=scored["landslide_score"],
            multihazard_score=scored["multihazard_score"],
            priority_level=scored["priority_level"],
            confidence=scored["confidence"],
            shap_values=scored["shap_values"],
            created_at=datetime.utcnow() - timedelta(days=random.randint(15, 90)),
        )
        db_habitations.append(hab_obj)

    db.add_all(db_habitations)
    await db.flush()
    logger.info("50 Habitations seeded and scored.")

    # 3. Load and Score Sites
    db_sites = []
    logger.info(f"Evaluating {len(raw_sites)} relocation sites...")
    for s in raw_sites:
        site_features = {
            "area_hectares": s["area_hectares"],
            "water_access": s["water_access"],
            "road_connectivity_km": s["road_connectivity_km"],
            "livelihood_score": s["livelihood_score"],
            "land_score": s["land_score"],
            "infrastructure_score": s["infrastructure_score"],
        }
        evaluated = scoring_service.capacity_scorer.evaluate_site(site_features)

        site_obj = RelocationSite(
            id=s["id"],
            name=s["name"],
            district=s["district"],
            state=s["state"],
            latitude=s["latitude"],
            longitude=s["longitude"],
            area_hectares=s["area_hectares"],
            water_access=s["water_access"],
            road_connectivity_km=s["road_connectivity_km"],
            livelihood_score=s["livelihood_score"],
            land_score=s["land_score"],
            infrastructure_score=s["infrastructure_score"],
            capacity_score=evaluated["capacity_score"],
            overall_capacity=evaluated["overall_capacity"],
            confidence=evaluated["confidence"],
            shap_values=evaluated["shap_values"],
            status=s["status"],
            created_at=datetime.utcnow() - timedelta(days=random.randint(20, 100)),
        )
        db_sites.append(site_obj)

    db.add_all(db_sites)
    await db.flush()
    logger.info("20 Relocation sites seeded and evaluated.")

    # 4. Seed Hazard Events
    db_events = []
    for ev in raw_events:
        event_obj = HazardEvent(
            id=ev["id"],
            name=ev["name"],
            type=ev["type"],
            severity=ev["severity"],
            latitude=ev["latitude"],
            longitude=ev["longitude"],
            date=ev["date"],
            affected_habitations=ev["affected_habitations"],
            created_at=datetime.utcnow() - timedelta(days=20),
        )
        db_events.append(event_obj)

    db.add_all(db_events)
    await db.flush()
    logger.info("5 Hazard events seeded.")

    # 5. Seed 3 Sample Relocation Plans
    # Plan 1: Approved (Chooralmala or Mundakkai in Wayanad to Kalpetta Site-A)
    # Plan 2: Draft / In-Review (Joshimath Sunil Ward to Chamoli Kothiyalsain Plain)
    # Plan 3: Rejected (Pettimudi Tea Division to inappropriate / distant site)
    plans = [
        RelocationPlan(
            habitation_id=1,  # Chooralmala
            site_id=1,        # Kalpetta Safe Plateau Site-A
            officer_id=officers[1].id,
            gate1_passed=True,
            gate2_passed=True,
            priority_level="IMMEDIATE",
            officer_notes="Full district council sign-off completed. Top priority resettlement sanctioned under Kerala State Disaster Mitigation Fund.",
            status=PlanStatus.APPROVED.value,
            approved_at=datetime.utcnow() - timedelta(days=5),
            created_at=datetime.utcnow() - timedelta(days=14),
        ),
        RelocationPlan(
            habitation_id=11, # Joshimath Sunil Ward
            site_id=6,        # Chamoli Kothiyalsain Plain
            officer_id=officers[2].id,
            gate1_passed=True,
            gate2_passed=False,
            priority_level="IMMEDIATE",
            officer_notes="Sub-Divisional Magistrate field inspection pending for municipal sewer and power grid line connectivity.",
            status=PlanStatus.DRAFT.value,
            approved_at=None,
            created_at=datetime.utcnow() - timedelta(days=3),
        ),
        RelocationPlan(
            habitation_id=31, # Pettimudi Tea Division
            site_id=15,       # Thodupuzha Foothill Haven (excessive distance)
            officer_id=officers[1].id,
            gate1_passed=True,
            gate2_passed=False,
            priority_level="HIGH",
            officer_notes="Rejected due to excessive distance (54km) from plantation worker community livelihoods. Alternative site in Munnar periphery recommended.",
            status=PlanStatus.REJECTED.value,
            approved_at=None,
            created_at=datetime.utcnow() - timedelta(days=12),
        ),
    ]
    db.add_all(plans)
    await db.flush()
    logger.info("3 Relocation plans seeded.")

    # 6. Audit Trail Logs
    logs = [
        AuditLog(
            action="INITIAL_SEED_COMPLETE",
            entity_type="System",
            entity_id=1,
            officer_id=officers[0].id,
            officer_name=officers[0].full_name,
            details={"message": "AI-PUNARVAS primed with 50 habitations and 20 candidate sites across 5 disaster zones."},
            timestamp=datetime.utcnow() - timedelta(days=10),
        ),
        AuditLog(
            action="PLAN_APPROVED",
            entity_type="RelocationPlan",
            entity_id=plans[0].id,
            officer_id=officers[1].id,
            officer_name=officers[1].full_name,
            details={"habitation": "Chooralmala", "site": "Kalpetta Safe Plateau Site-A", "approved_capacity": 840},
            timestamp=datetime.utcnow() - timedelta(days=5),
        ),
        AuditLog(
            action="GATE1_PASSED",
            entity_type="RelocationPlan",
            entity_id=plans[1].id,
            officer_id=officers[2].id,
            officer_name=officers[2].full_name,
            details={"habitation": "Joshimath Sunil Ward", "priority": "IMMEDIATE"},
            timestamp=datetime.utcnow() - timedelta(days=3),
        ),
        AuditLog(
            action="PLAN_REJECTED",
            entity_type="RelocationPlan",
            entity_id=plans[2].id,
            officer_id=officers[1].id,
            officer_name=officers[1].full_name,
            details={"habitation": "Pettimudi Tea Division", "reason": "Livelihood separation distance exceeded"},
            timestamp=datetime.utcnow() - timedelta(days=11),
        ),
    ]
    db.add_all(logs)
    await db.commit()
    logger.info("Database seeding successfully completed!")


async def main():
    """CLI runner for direct seed execution."""
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        await seed_database(session)


if __name__ == "__main__":
    import random
    asyncio.run(main())
