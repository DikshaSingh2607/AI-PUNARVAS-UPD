from typing import List, Dict, Any, Union, Optional
import numpy as np


class MultiHazardFusion:
    """
    Multi-Hazard Risk Fusion Engine.
    Combines independent flood and landslide susceptibility probabilities
    incorporating compounding / cascading risk interaction dynamics.
    """

    # Threshold standards for disaster evacuation & relocation prioritization
    IMMEDIATE_THRESHOLD = 0.75
    HIGH_THRESHOLD = 0.55
    PHASED_THRESHOLD = 0.35

    def __init__(self, flood_weight: float = 0.50, landslide_weight: float = 0.50):
        self.flood_weight = flood_weight
        self.landslide_weight = landslide_weight

    def fuse(
        self,
        flood_score: float,
        landslide_score: float,
        flood_weight: Optional[float] = None,
        landslide_weight: Optional[float] = None,
    ) -> float:
        """
        Combine hazard probabilities with non-linear compounding cascade multiplier.
        Cascading events (e.g. landslide damming river followed by flash flood) create super-additive risk.
        """
        f_wt = flood_weight if flood_weight is not None else self.flood_weight
        l_wt = landslide_weight if landslide_weight is not None else self.landslide_weight

        # Normalize weights
        total_wt = f_wt + l_wt
        if total_wt <= 0:
            total_wt = 1.0
        w_f = f_wt / total_wt
        w_l = l_wt / total_wt

        base_score = (w_f * flood_score) + (w_l * landslide_score)

        # Compounding synergy factor: when both risks are elevated, interaction multiplier applies
        compounding_synergy = 0.18 * (flood_score * landslide_score)

        # Dominant hazard peak dominance
        peak_hazard = max(flood_score, landslide_score)
        
        # 70% weighted blended + 30% peak hazard dominance + compounding interaction
        fused_score = (0.70 * base_score) + (0.30 * peak_hazard) + compounding_synergy
        return round(float(np.clip(fused_score, 0.0, 1.0)), 4)

    def compute_priority(self, score: float) -> str:
        """
        Determine resettlement urgency classification according to NDMA guidelines:
        - IMMEDIATE: >= 0.75 (Critical imminent disaster threat to life)
        - HIGH: >= 0.55 (Severe danger during monsoon/seismic trigger)
        - PHASED: >= 0.35 (Vulnerable community needing planned transition)
        - SAFE: < 0.35 (Low hazard susceptibility)
        """
        if score >= self.IMMEDIATE_THRESHOLD:
            return "IMMEDIATE"
        elif score >= self.HIGH_THRESHOLD:
            return "HIGH"
        elif score >= self.PHASED_THRESHOLD:
            return "PHASED"
        else:
            return "SAFE"

    def compute_red_zone_map(self, habitations_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score a collection of habitation records and flag red zones.
        Red zone = IMMEDIATE or HIGH priority level.
        """
        scored_habitations = []
        for hab in habitations_list:
            f_score = hab.get("flood_score", 0.0)
            l_score = hab.get("landslide_score", 0.0)
            
            multi_score = self.fuse(f_score, l_score)
            priority = self.compute_priority(multi_score)
            is_red_zone = priority in ["IMMEDIATE", "HIGH"]

            updated_hab = dict(hab)
            updated_hab["multihazard_score"] = multi_score
            updated_hab["priority_level"] = priority
            updated_hab["is_red_zone"] = is_red_zone
            scored_habitations.append(updated_hab)

        return scored_habitations
