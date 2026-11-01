from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, ConfigDict, Field, EmailStr


# ==========================================
# Auth & Token Schemas
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "OfficerResponse"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ==========================================
# Officer Schemas
# ==========================================
class OfficerBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    full_name: str = Field(..., min_length=1, max_length=128)
    email: EmailStr
    district: str = "All"
    role: str = "OFFICER"
    is_active: bool = True


class OfficerCreate(OfficerBase):
    password: str = Field(..., min_length=6)


class OfficerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    district: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class OfficerResponse(OfficerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Habitation Schemas
# ==========================================
class HabitationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    district: str
    state: str
    population: int = Field(..., ge=0)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    elevation: Optional[float] = None
    slope: Optional[float] = None
    distance_to_river: Optional[float] = None
    rainfall_annual: Optional[float] = None
    soil_type: Optional[str] = "loam"
    ndvi: Optional[float] = 0.45
    land_use_type: Optional[str] = "settlement"
    slope_angle: Optional[float] = None
    soil_moisture: Optional[float] = None
    vegetation_cover: Optional[float] = None
    distance_to_fault: Optional[float] = None
    rainfall_intensity: Optional[float] = None


class HabitationCreate(HabitationBase):
    flood_score: Optional[float] = None
    landslide_score: Optional[float] = None
    multihazard_score: Optional[float] = None
    priority_level: Optional[str] = None


class HabitationUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    population: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    slope: Optional[float] = None
    distance_to_river: Optional[float] = None
    rainfall_annual: Optional[float] = None
    soil_type: Optional[str] = None
    ndvi: Optional[float] = None
    land_use_type: Optional[str] = None
    priority_level: Optional[str] = None


class SHAPFeatureImpact(BaseModel):
    feature: str
    feature_name: str
    value: Optional[Any] = None
    impact: float
    direction: str  # INCREASES_RISK or DECREASES_RISK
    magnitude: float
    percentage: Optional[float] = None


class HabitationResponse(HabitationBase):
    id: int
    flood_score: float
    landslide_score: float
    multihazard_score: float
    priority_level: str
    confidence: float
    shap_values: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitationDetailResponse(HabitationResponse):
    explanation_text: Optional[str] = None
    shap_breakdown: Optional[List[SHAPFeatureImpact]] = None
    confidence_info: Optional[Dict[str, Any]] = None
    recommended_sites: Optional[List["RelocationSiteResponse"]] = None


class HabitationStatsSummary(BaseModel):
    total_habitations: int
    immediate_count: int
    high_count: int
    phased_count: int
    safe_count: int
    avg_flood_score: float
    avg_landslide_score: float
    avg_multihazard_score: float
    total_population_at_risk: int


# ==========================================
# Relocation Site Schemas
# ==========================================
class RelocationSiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    district: str
    state: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    area_hectares: float = Field(..., gt=0)
    water_access: bool = True
    road_connectivity_km: float = Field(..., ge=0)
    livelihood_score: float = Field(0.7, ge=0, le=1)
    land_score: float = Field(0.7, ge=0, le=1)
    infrastructure_score: float = Field(0.6, ge=0, le=1)


class RelocationSiteCreate(RelocationSiteBase):
    overall_capacity: Optional[int] = None
    capacity_score: Optional[float] = None
    status: Optional[str] = "PENDING"


class RelocationSiteUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = None
    water_access: Optional[bool] = None
    road_connectivity_km: Optional[float] = None
    livelihood_score: Optional[float] = None
    land_score: Optional[float] = None
    infrastructure_score: Optional[float] = None
    status: Optional[str] = None


class RelocationSiteResponse(RelocationSiteBase):
    id: int
    capacity_score: float
    overall_capacity: int
    confidence: float
    shap_values: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RelocationSiteDetailResponse(RelocationSiteResponse):
    explanation_text: Optional[str] = None
    shap_breakdown: Optional[List[SHAPFeatureImpact]] = None
    allocated_population: Optional[int] = 0
    available_capacity: Optional[int] = None


class RelocationSiteCompareResponse(BaseModel):
    site_a: RelocationSiteResponse
    site_b: RelocationSiteResponse
    comparison: Dict[str, Any]
    recommendation: str


# ==========================================
# Relocation Plan Schemas
# ==========================================
class RelocationPlanCreate(BaseModel):
    habitation_id: int
    site_id: int
    officer_notes: Optional[str] = None


class RelocationPlanUpdate(BaseModel):
    officer_notes: Optional[str] = None
    status: Optional[str] = None


class Gate2CheckRequest(BaseModel):
    site_id: Optional[int] = None
    habitation_id: Optional[int] = None


class Gate2CheckResponse(BaseModel):
    plan_id: Optional[int] = None
    habitation_id: int
    habitation_name: str
    habitation_population: int
    site_id: int
    site_name: str
    site_capacity: int
    capacity_sufficient: bool
    distance_km: float
    distance_acceptable: bool
    water_access_verified: bool
    road_access_verified: bool
    livelihood_compatibility: float
    gate2_passed: bool
    evaluation_notes: List[str]


class RelocationPlanResponse(BaseModel):
    id: int
    habitation_id: int
    site_id: int
    officer_id: Optional[int] = None
    gate1_passed: bool
    gate2_passed: bool
    priority_level: str
    officer_notes: Optional[str] = None
    status: str
    approved_at: Optional[datetime] = None
    created_at: datetime

    habitation: Optional[HabitationResponse] = None
    site: Optional[RelocationSiteResponse] = None
    officer: Optional[OfficerResponse] = None

    model_config = ConfigDict(from_attributes=True)


class RelocationPlanAuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    officer_id: Optional[int] = None
    officer_name: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Hazard Event Schemas
# ==========================================
class HazardEventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    type: str  # FLOOD, LANDSLIDE, CYCLONE
    severity: str = "MED"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: datetime
    affected_habitations: Optional[List[Any]] = []


class HazardEventCreate(HazardEventBase):
    pass


class HazardEventResponse(HazardEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DistrictRiskSummary(BaseModel):
    district: str
    state: str
    total_habitations: int
    total_population: int
    critical_habitations: int
    high_risk_habitations: int
    avg_multihazard_score: float
    available_sites_count: int
    total_safe_capacity: int


# ==========================================
# Dashboard Schemas
# ==========================================
class DashboardStatsResponse(BaseModel):
    total_at_risk: int
    immediate_count: int
    high_count: int
    phased_count: int
    safe_count: int
    sites_ready: int
    plans_approved: int
    plans_pending: int
    avg_flood_score: float
    avg_landslide_score: float
    avg_multihazard_score: float


class RecentActivityItem(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    officer_name: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


# ==========================================
# GeoJSON Schemas
# ==========================================
class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Any


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


Token.model_rebuild()
HabitationDetailResponse.model_rebuild()
RelocationPlanResponse.model_rebuild()
