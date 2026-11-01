from typing import Dict, Any, List, Optional
from app.ml.flood_model import FloodModel
from app.ml.landslide_model import LandslideModel
from app.ml.multihazard import MultiHazardFusion
from app.ml.capacity_scorer import SiteCapacityScorer
from app.ml.explainability import ExplainabilityEngine
import logging

logger = logging.getLogger(__name__)


class ScoringService:
    """
    Orchestration service combining Flood, Landslide, Multi-Hazard Fusion,
    Site Capacity, and Explainability models.
    """

    def __init__(self):
        logger.info("Initializing AI-PUNARVAS ML Models and Explainability Engines...")
        self.flood_model = FloodModel()
        self.landslide_model = LandslideModel()
        self.multihazard = MultiHazardFusion()
        self.capacity_scorer = SiteCapacityScorer()
        self.explainability = ExplainabilityEngine()
        logger.info("ML Engine successfully initialized.")

    def score_habitation(self, hab_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the full multi-hazard risk assessment pipeline on a habitation:
        1. Predict flood susceptibility score
        2. Predict landslide susceptibility score
        3. Multi-hazard non-linear fusion
        4. Prioritization classification (IMMEDIATE, HIGH, PHASED, SAFE)
        5. SHAP explainability attribution extraction
        6. Human-readable natural language justification
        7. Model confidence rating
        """
        flood_score = self.flood_model.predict(hab_data)
        landslide_score = self.landslide_model.predict(hab_data)

        flood_shap = self.flood_model.explain(hab_data)
        landslide_shap = self.landslide_model.explain(hab_data)

        multihazard_score = self.multihazard.fuse(flood_score, landslide_score)
        priority_level = self.multihazard.compute_priority(multihazard_score)

        # Merge SHAP features into a unified multi-hazard SHAP attribution map
        combined_shap = {}
        for k, v in flood_shap.items():
            combined_shap[f"flood_{k}"] = v * 0.5
        for k, v in landslide_shap.items():
            combined_shap[f"landslide_{k}"] = v * 0.5

        # Format SHAP breakdown for UI
        # We can pass raw feature values for the UI tooltips
        shap_breakdown = self.explainability.format_shap_for_ui(
            {**flood_shap, **landslide_shap},
            feature_values=hab_data,
        )

        dominant_model = "flood" if flood_score >= landslide_score else "landslide"
        primary_shap = flood_shap if dominant_model == "flood" else landslide_shap
        explanation_text = self.explainability.generate_explanation_text(
            primary_shap,
            score=max(flood_score, landslide_score),
            model_type=dominant_model,
        )

        confidence_info = self.explainability.confidence_level(
            multihazard_score,
            shap_values=primary_shap,
        )

        return {
            "flood_score": flood_score,
            "landslide_score": landslide_score,
            "multihazard_score": multihazard_score,
            "priority_level": priority_level,
            "confidence": confidence_info["score"],
            "confidence_info": confidence_info,
            "shap_values": {
                "flood": flood_shap,
                "landslide": landslide_shap,
                "combined": combined_shap,
            },
            "shap_breakdown": shap_breakdown,
            "explanation_text": explanation_text,
        }

    def score_site(self, site_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a candidate relocation site:
        1. Predict capacity suitability score
        2. Estimate maximum sustainable population
        3. Compute SHAP factors
        4. Generate administrative justification
        """
        capacity_score = self.capacity_scorer.predict(site_data)
        shap_values = self.capacity_scorer.explain(site_data)
        area_ha = float(site_data.get("area_hectares", 10.0))
        overall_capacity = self.capacity_scorer.estimate_capacity(area_ha, capacity_score)

        shap_breakdown = self.explainability.format_shap_for_ui(
            shap_values,
            feature_values=site_data,
        )

        explanation_text = self.explainability.generate_explanation_text(
            shap_values,
            score=capacity_score,
            model_type="site",
        )

        return {
            "capacity_score": capacity_score,
            "overall_capacity": overall_capacity,
            "confidence": 0.88,
            "shap_values": shap_values,
            "shap_breakdown": shap_breakdown,
            "explanation_text": explanation_text,
        }

    async def run_full_assessment(
        self,
        district: Optional[str] = None,
        db_session = None,
    ) -> Dict[str, Any]:
        """
        Batch rescore all habitations and sites across a specific district or all districts.
        """
        from sqlalchemy import select
        from app.models.models import Habitation, RelocationSite

        query_hab = select(Habitation)
        query_site = select(RelocationSite)
        if district and district.lower() != "all":
            query_hab = query_hab.where(Habitation.district.ilike(district))
            query_site = query_site.where(RelocationSite.district.ilike(district))

        res_hab = await db_session.execute(query_hab)
        habitations = res_hab.scalars().all()

        res_site = await db_session.execute(query_site)
        sites = res_site.scalars().all()

        updated_habs = 0
        for hab in habitations:
            hab_dict = {
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
            scored = self.score_habitation(hab_dict)
            hab.flood_score = scored["flood_score"]
            hab.landslide_score = scored["landslide_score"]
            hab.multihazard_score = scored["multihazard_score"]
            hab.priority_level = scored["priority_level"]
            hab.confidence = scored["confidence"]
            hab.shap_values = scored["shap_values"]
            updated_habs += 1

        updated_sites = 0
        for site in sites:
            site_dict = {
                "area_hectares": site.area_hectares,
                "water_access": site.water_access,
                "road_connectivity_km": site.road_connectivity_km,
                "livelihood_score": site.livelihood_score,
                "land_score": site.land_score,
                "infrastructure_score": site.infrastructure_score,
            }
            scored = self.score_site(site_dict)
            site.capacity_score = scored["capacity_score"]
            site.overall_capacity = scored["overall_capacity"]
            site.confidence = scored["confidence"]
            site.shap_values = scored["shap_values"]
            updated_sites += 1

        await db_session.commit()

        return {
            "status": "success",
            "district": district or "All",
            "habitations_reassessed": updated_habs,
            "sites_reassessed": updated_sites,
        }

    def recalibrate_models(self, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recalibration interface for post-disaster officer ground-truthing feedback.
        Adjusts hazard component weights dynamically based on recorded field ground-truth.
        """
        district = feedback_data.get("district", "General")
        flood_observed = feedback_data.get("flood_observed", False)
        landslide_observed = feedback_data.get("landslide_observed", False)
        officer_note = feedback_data.get("officer_note", "Model recalibration feedback recorded.")

        # Tune weights according to observed disaster dynamics
        if landslide_observed and not flood_observed:
            self.multihazard.landslide_weight = min(0.75, self.multihazard.landslide_weight + 0.05)
            self.multihazard.flood_weight = 1.0 - self.multihazard.landslide_weight
        elif flood_observed and not landslide_observed:
            self.multihazard.flood_weight = min(0.75, self.multihazard.flood_weight + 0.05)
            self.multihazard.landslide_weight = 1.0 - self.multihazard.flood_weight

        return {
            "status": "recalibrated",
            "district": district,
            "updated_flood_weight": round(self.multihazard.flood_weight, 2),
            "updated_landslide_weight": round(self.multihazard.landslide_weight, 2),
            "note": officer_note,
        }


scoring_service = ScoringService()
