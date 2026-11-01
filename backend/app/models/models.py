from datetime import datetime
from typing import Optional, Any, Dict, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from geoalchemy2 import Geometry
from app.core.database import Base
import enum


class PriorityLevel(str, enum.Enum):
    IMMEDIATE = "IMMEDIATE"
    HIGH = "HIGH"
    PHASED = "PHASED"
    SAFE = "SAFE"


class SiteStatus(str, enum.Enum):
    VETTED = "VETTED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"


class PlanStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MONITORING = "MONITORING"


class HazardType(str, enum.Enum):
    FLOOD = "FLOOD"
    LANDSLIDE = "LANDSLIDE"
    CYCLONE = "CYCLONE"


class HazardSeverity(str, enum.Enum):
    LOW = "LOW"
    MED = "MED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class OfficerRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    COLLECTOR = "COLLECTOR"
    PLANNER = "PLANNER"


class Officer(Base):
    __tablename__ = "officers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(64), nullable=False, default="All")
    role: Mapped[str] = mapped_column(String(32), default=OfficerRole.OFFICER.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    relocation_plans = relationship("RelocationPlan", back_populates="officer", lazy="selectin")
    audit_logs = relationship("AuditLog", back_populates="officer", lazy="selectin")


class Habitation(Base):
    __tablename__ = "habitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    district: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(64), nullable=False)
    population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Geographic coordinates & spatial column
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geometry = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # Susceptibility scores
    flood_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    landslide_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    multihazard_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    priority_level: Mapped[str] = mapped_column(
        String(32),
        default=PriorityLevel.SAFE.value,
        nullable=False,
        index=True
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    shap_values: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Environmental physical indicators
    elevation: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    slope: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    distance_to_river: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rainfall_annual: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soil_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ndvi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    land_use_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    slope_angle: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soil_moisture: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vegetation_cover: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    distance_to_fault: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rainfall_intensity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    relocation_plans = relationship("RelocationPlan", back_populates="habitation", lazy="selectin")


class RelocationSite(Base):
    __tablename__ = "relocation_sites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    district: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(64), nullable=False)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geometry = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # Physical & logistical metrics
    area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    water_access: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    road_connectivity_km: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    livelihood_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    capacity_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    land_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    infrastructure_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    overall_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    confidence: Mapped[float] = mapped_column(Float, default=0.88, nullable=False)
    shap_values: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        default=SiteStatus.PENDING.value,
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    relocation_plans = relationship("RelocationPlan", back_populates="site", lazy="selectin")


class RelocationPlan(Base):
    __tablename__ = "relocation_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    habitation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("habitations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    site_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("relocation_sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    officer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Gate verification
    gate1_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gate2_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority_level: Mapped[str] = mapped_column(String(32), nullable=False, default="IMMEDIATE")
    officer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        default=PlanStatus.DRAFT.value,
        nullable=False,
        index=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    habitation = relationship("Habitation", back_populates="relocation_plans", lazy="selectin")
    site = relationship("RelocationSite", back_populates="relocation_plans", lazy="selectin")
    officer = relationship("Officer", back_populates="relocation_plans", lazy="selectin")


class HazardEvent(Base):
    __tablename__ = "hazard_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="MED")
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    affected_habitations: Mapped[Optional[List[Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    officer_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("officers.id", ondelete="SET NULL"), nullable=True
    )
    officer_name: Mapped[str] = mapped_column(String(128), default="System", nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    officer = relationship("Officer", back_populates="audit_logs", lazy="selectin")
