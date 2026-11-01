"""
advisory_engine.py — Critical Evacuation Advisory Engine
========================================================
Monitors habitation risk scores + real-time weather triggers.
Generates CRITICAL EVACUATION ADVISORIES when conditions exceed safe thresholds.

Rules:
- If multihazard_score >= 0.75 AND current_7day_rain > 150mm → CRITICAL EVACUATION ADVISORY
- If multihazard_score >= 0.75 → HIGH EVACUATION WARNING
- If current_7day_rain > 200mm AND landslide_score > 0.60 → LANDSLIDE FLASH WARNING
- If flood_score > 0.80 AND current_7day_rain > 100mm → FLOOD IMMINENT WARNING
"""

import asyncio
import logging
import math
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Habitation, RelocationSite
from app.gis.real_data import get_current_rainfall

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth's surface in kilometres.
    """
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(earth_radius_km * c, 2)


class AdvisoryEngine:
    """
    Early warning & evacuation advisory decision engine.
    Monitors vulnerable habitations against real-time meteorological conditions
    and matches at-risk communities to vetted relocation destinations.
    """

    async def match_nearest_site(
        self, lat: float, lon: float, db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """
        Identify the closest VETTED relocation site to the target coordinate
        using precise Haversine great-circle calculation.
        """
        # First query vetted relocation sites
        stmt = select(RelocationSite).where(RelocationSite.status == "VETTED")
        result = await db.execute(stmt)
        sites = result.scalars().all()

        # If no vetted sites exist in DB, fallback to all available sites
        if not sites:
            stmt = select(RelocationSite)
            result = await db.execute(stmt)
            sites = result.scalars().all()

        if not sites:
            return None

        best_site = None
        min_distance = float("inf")

        for site in sites:
            dist = haversine_distance(lat, lon, site.latitude, site.longitude)
            if dist < min_distance:
                min_distance = dist
                best_site = site

        if best_site:
            return {
                "site_id": best_site.id,
                "site_name": best_site.name,
                "district": best_site.district,
                "distance_km": min_distance,
                "capacity": best_site.overall_capacity,
                "status": best_site.status,
            }
        return None

    async def evaluate_habitation(
        self, habitation_id: int, db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluate a single habitation by combining its static hazard vulnerability scores
        with live 7-day Open-Meteo precipitation observations.

        Returns an evacuation advisory record if safety thresholds are breached,
        or None if conditions remain within normal thresholds.
        """
        # 1. Fetch habitation record
        stmt = select(Habitation).where(Habitation.id == habitation_id)
        result = await db.execute(stmt)
        hab = result.scalar_one_or_none()
        if not hab:
            logger.warning(f"Habitation {habitation_id} not found for advisory evaluation.")
            return None

        # 2. Fetch live 7-day rainfall from Open-Meteo
        rain_data = await get_current_rainfall(hab.latitude, hab.longitude)
        current_7day_rain = float(rain_data.get("total_7day_mm", 0.0))
        max_daily_rain = float(rain_data.get("max_daily_mm", 0.0))

        # 3. Evaluate Rule-based Thresholds
        m_score = float(hab.multihazard_score or 0.0)
        l_score = float(hab.landslide_score or 0.0)
        f_score = float(hab.flood_score or 0.0)

        triggers: List[str] = []
        advisory_type: Optional[str] = None
        recommended_action: str = ""

        # Rule 1: multihazard_score >= 0.75 AND current_7day_rain > 150mm -> CRITICAL EVACUATION ADVISORY
        if m_score >= 0.75 and current_7day_rain > 150.0:
            advisory_type = "CRITICAL EVACUATION ADVISORY"
            triggers.append(f"Compounding multi-hazard index ({m_score:.2f}) exceeds critical ceiling 0.75")
            triggers.append(
                f"Severe 7-day cumulative rainfall ({current_7day_rain:.1f}mm) exceeds 150mm critical threshold"
            )
            recommended_action = (
                "IMMEDIATE EMERGENCY EVACUATION: Mobilize local administration, NDRF/SDRF assets. "
                "Move residents to nearest designated shelter within 4 hours. Barricade high-risk access routes."
            )

        # Rule 2: current_7day_rain > 200mm AND landslide_score > 0.60 -> LANDSLIDE FLASH WARNING
        elif current_7day_rain > 200.0 and l_score > 0.60:
            advisory_type = "LANDSLIDE FLASH WARNING"
            triggers.append(
                f"Torrential rainfall shock ({current_7day_rain:.1f}mm) > 200mm saturating slope subsoil"
            )
            triggers.append(
                f"Landslide susceptibility index ({l_score:.2f}) exceeds high-risk cutoff 0.60"
            )
            recommended_action = (
                "FLASH EVACUATION: Evacuate hillside households on slopes >25 degrees. "
                "Halt vehicular traffic on ghat roads. Station geotechnical reconnaissance units."
            )

        # Rule 3: flood_score > 0.80 AND current_7day_rain > 100mm -> FLOOD IMMINENT WARNING
        elif f_score > 0.80 and current_7day_rain > 100.0:
            advisory_type = "FLOOD IMMINENT WARNING"
            triggers.append(f"Flood susceptibility index ({f_score:.2f}) exceeds severe threshold 0.80")
            triggers.append(f"Active 7-day precipitation ({current_7day_rain:.1f}mm) exceeds 100mm flood trigger")
            recommended_action = (
                "RAPID FLOOD PREPAREDNESS: Evacuate low-lying riverbank habitations. "
                "Pre-position inflatable boats and relief supplies at nodal points."
            )

        # Rule 4: multihazard_score >= 0.75 -> HIGH EVACUATION WARNING
        elif m_score >= 0.75:
            advisory_type = "HIGH EVACUATION WARNING"
            triggers.append(
                f"Multi-hazard risk score ({m_score:.2f}) classified as IMMEDIATE priority"
            )
            recommended_action = (
                "PREVENTIVE EVACUATION READINESS: Issue standby notice to village heads. "
                "Identify elderly, women, and children for early transit to vetted relocation camps."
            )

        # Additional Watch Level for active monsoon in vulnerable habitations
        elif (m_score >= 0.55 or hab.priority_level == "HIGH") and current_7day_rain > 80.0:
            advisory_type = "MONSOON WATCH ADVISORY"
            triggers.append(
                f"Elevated risk score ({m_score:.2f}) coupled with moderate rainfall ({current_7day_rain:.1f}mm)"
            )
            recommended_action = (
                "24x7 geotechnical watch: Inspect slope drainage and river gauges hourly. "
                "Test emergency sirens and broadcast public warnings."
            )

        # If no advisory conditions are met, return None
        if not advisory_type:
            return None

        # 4. Find nearest vetted relocation destination
        nearest_site = await self.match_nearest_site(hab.latitude, hab.longitude, db)
        recommended_site_id = nearest_site["site_id"] if nearest_site else None
        recommended_site_name = nearest_site["site_name"] if nearest_site else "Designated Safe Camp"
        site_distance_km = nearest_site["distance_km"] if nearest_site else None

        # 5. Extract explainable AI (SHAP) contributing factors
        shap_reasons: List[Dict[str, Any]] = []
        if hab.shap_values and isinstance(hab.shap_values, dict):
            combined_shap: List[tuple] = []
            for hazard_model, feat_dict in hab.shap_values.items():
                if isinstance(feat_dict, dict):
                    for feat_name, shap_val in feat_dict.items():
                        if isinstance(shap_val, (int, float)):
                            combined_shap.append((hazard_model, feat_name, float(shap_val)))

            # Sort by highest absolute impact
            combined_shap.sort(key=lambda item: abs(item[2]), reverse=True)
            for hazard_model, feat_name, shap_val in combined_shap[:4]:
                shap_reasons.append({
                    "hazard_model": hazard_model,
                    "factor": feat_name.replace("_", " ").title(),
                    "impact": round(shap_val, 4),
                    "effect": "increases risk" if shap_val > 0 else "reduces risk",
                })

        # Estimate households based on average Indian family size (4.6 members)
        households_est = max(1, int(round(hab.population / 4.6)))

        return {
            "habitation_id": hab.id,
            "habitation_name": hab.name,
            "district": hab.district,
            "state": hab.state,
            "lat": hab.latitude,
            "lon": hab.longitude,
            "advisory_type": advisory_type,
            "multihazard_score": hab.multihazard_score,
            "flood_score": hab.flood_score,
            "landslide_score": hab.landslide_score,
            "current_rainfall_7d_mm": round(current_7day_rain, 1),
            "max_daily_rain_mm": round(max_daily_rain, 1),
            "triggers": triggers,
            "recommended_action": recommended_action,
            "recommended_site_id": recommended_site_id,
            "recommended_site_name": recommended_site_name,
            "site_distance_km": site_distance_km,
            "population_affected": hab.population,
            "households_estimate": households_est,
            "shap_reasons": shap_reasons,
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def scan_all_habitations(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Scan all high-vulnerability habitations in the system (priority_level IN IMMEDIATE, HIGH),
        evaluating each against live weather data to generate a prioritized list of active advisories.
        """
        stmt = (
            select(Habitation)
            .where(Habitation.priority_level.in_(["IMMEDIATE", "HIGH"]))
            .order_by(Habitation.multihazard_score.desc())
        )
        result = await db.execute(stmt)
        habitations = result.scalars().all()

        advisories: List[Dict[str, Any]] = []

        for hab in habitations:
            adv = await self.evaluate_habitation(hab.id, db)
            if adv:
                advisories.append(adv)
            # Brief rate-limiting pause to prevent API exhaustion
            await asyncio.sleep(0.08)

        # Sort advisories by severity rank and risk scores
        severity_rank = {
            "CRITICAL EVACUATION ADVISORY": 1,
            "LANDSLIDE FLASH WARNING": 2,
            "FLOOD IMMINENT WARNING": 3,
            "HIGH EVACUATION WARNING": 4,
            "MONSOON WATCH ADVISORY": 5,
        }

        advisories.sort(
            key=lambda a: (
                severity_rank.get(a["advisory_type"], 99),
                -a["multihazard_score"],
                -a["current_rainfall_7d_mm"],
            )
        )

        logger.info(f"Advisory scan completed. Generated {len(advisories)} active evacuation advisories.")
        return advisories
