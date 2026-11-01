from typing import Dict, Any, List, Optional
import math


class ExplainabilityEngine:
    """
    SHAP-driven Explainability & Natural Language Interpretation Engine.
    Converts raw model weights and Shapley feature attributions into actionable
    administrative insights for district collectors and disaster management officers.
    """

    FEATURE_LABELS = {
        # Flood features
        "elevation": "Topographic Elevation",
        "slope": "Terrain Slope Angle",
        "distance_to_river": "Proximity to River Channel",
        "rainfall_annual": "Annual Precipitation Volume",
        "soil_type": "Soil Permeability & Drainage",
        "ndvi": "Vegetation Density Index (NDVI)",
        "land_use_type": "Land Use / Land Cover",
        # Landslide features
        "slope_angle": "Slope Gradient",
        "aspect": "Slope Orientation (Aspect)",
        "curvature": "Topographic Concavity / Curvature",
        "soil_moisture": "Soil Pore Water Saturation",
        "vegetation_cover": "Canopy Root Reinforcement",
        "distance_to_fault": "Proximity to Tectonic Fault Line",
        "rainfall_intensity": "Peak Monsoon Rainfall Intensity",
        # Site features
        "area_hectares": "Usable Land Parcel Area",
        "water_access": "Potable Water Resource Access",
        "road_connectivity_km": "Distance to Arterial Road",
        "livelihood_score": "Livelihood & Economic Access",
        "land_score": "Geotechnical Land Stability",
        "infrastructure_score": "Basic Civic Infrastructure",
    }

    @classmethod
    def format_shap_for_ui(
        cls,
        shap_dict: Dict[str, float],
        feature_values: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Format SHAP attributions into sorted UI display list with percentage contributions.
        """
        if not shap_dict:
            return []

        total_abs_impact = sum(abs(v) for v in shap_dict.values()) or 1.0

        formatted = []
        for feat, val in shap_dict.items():
            impact = float(val)
            abs_impact = abs(impact)
            percentage = round((abs_impact / total_abs_impact) * 100.0, 1)

            # Determine directional hazard impact
            if impact > 0:
                direction = "INCREASES_RISK"
            elif impact < 0:
                direction = "DECREASES_RISK"
            else:
                direction = "NEUTRAL"

            feat_val = None
            if feature_values and feat in feature_values:
                feat_val = feature_values[feat]

            formatted.append({
                "feature": feat,
                "feature_name": cls.FEATURE_LABELS.get(feat, feat.replace("_", " ").title()),
                "value": feat_val,
                "impact": round(impact, 4),
                "direction": direction,
                "magnitude": round(abs_impact, 4),
                "percentage": percentage,
            })

        # Sort by impact magnitude descending
        formatted.sort(key=lambda x: x["magnitude"], reverse=True)
        return formatted

    @classmethod
    def generate_explanation_text(
        cls,
        shap_dict: Dict[str, float],
        score: float,
        model_type: str = "multihazard",
    ) -> str:
        """
        Generate contextual natural language narrative synthesizing the primary drivers.
        """
        if not shap_dict:
            return f"Susceptibility index is {score:.2f} based on standard regional vulnerability baseline."

        # Separate aggravating and mitigating factors
        aggravating = [
            (feat, val)
            for feat, val in shap_dict.items()
            if val > 0.01
        ]
        mitigating = [
            (feat, val)
            for feat, val in shap_dict.items()
            if val < -0.01
        ]

        aggravating.sort(key=lambda x: x[1], reverse=True)
        mitigating.sort(key=lambda x: abs(x[1]), reverse=True)

        agg_names = [cls.FEATURE_LABELS.get(f, f) for f, _ in aggravating[:3]]
        mit_names = [cls.FEATURE_LABELS.get(f, f) for f, _ in mitigating[:2]]

        narrative_parts = []

        if model_type.lower() in ["flood", "flood_model"]:
            severity = (
                "critical" if score >= 0.75
                else "high" if score >= 0.55
                else "moderate" if score >= 0.35
                else "low"
            )
            narrative_parts.append(
                f"Habitation presents a {severity} flood susceptibility score of {score:.2f}."
            )
            if agg_names:
                narrative_parts.append(
                    f"Primary hydraulic vulnerability drivers include {', '.join(agg_names)}."
                )
            if mit_names:
                narrative_parts.append(
                    f"Natural buffer resilience is provided by favorable {', '.join(mit_names)}."
                )

        elif model_type.lower() in ["landslide", "landslide_model"]:
            severity = (
                "acute" if score >= 0.75
                else "elevated" if score >= 0.55
                else "moderate" if score >= 0.35
                else "stable"
            )
            narrative_parts.append(
                f"Slope stability evaluation classifies terrain with {severity} landslide susceptibility ({score:.2f})."
            )
            if agg_names:
                narrative_parts.append(
                    f"Mass-wasting hazard is predominantly triggered by {', '.join(agg_names)}."
                )
            if mit_names:
                narrative_parts.append(
                    f"Terrain integrity is partially stabilized by {', '.join(mit_names)}."
                )

        elif model_type.lower() in ["site", "capacity"]:
            suitability = (
                "prime resettlement destination" if score >= 0.75
                else "suitable resettlement site" if score >= 0.55
                else "marginal site requiring mitigation" if score >= 0.35
                else "unsuitable site"
            )
            narrative_parts.append(
                f"Site evaluated as {suitability} with composite viability rating of {score:.2f}."
            )
            if agg_names:
                narrative_parts.append(
                    f"Principal viability advantages are {', '.join(agg_names)}."
                )
            if mitigating:
                narrative_parts.append(
                    f"Key development bottlenecks to address include {', '.join(mit_names)}."
                )

        else:
            narrative_parts.append(
                f"Composite risk assessment score is {score:.2f}."
            )
            if agg_names:
                narrative_parts.append(
                    f"Risk factors with highest amplification: {', '.join(agg_names)}."
                )
            if mit_names:
                narrative_parts.append(
                    f"Mitigating characteristics: {', '.join(mit_names)}."
                )

        return " ".join(narrative_parts)

    @classmethod
    def confidence_level(
        cls,
        score: float,
        shap_values: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Calculate model confidence based on feature convergence and distance from decision boundary.
        """
        # Distances from decision boundaries (0.35, 0.55, 0.75)
        boundaries = [0.35, 0.55, 0.75]
        min_dist_to_boundary = min(abs(score - b) for b in boundaries)

        feature_count = len(shap_values) if shap_values else 0

        if feature_count >= 5 and min_dist_to_boundary > 0.08:
            return {
                "level": "HIGH",
                "score": 0.92,
                "reason": "Strong feature convergence with clear distance from critical classification boundaries.",
            }
        elif feature_count >= 3 and min_dist_to_boundary > 0.03:
            return {
                "level": "MEDIUM",
                "score": 0.81,
                "reason": "Satisfactory indicator signals; score is close to relocation decision threshold.",
            }
        else:
            return {
                "level": "LOW",
                "score": 0.65,
                "reason": "Borderline transition zone; localized ground-truthing survey recommended.",
            }
