"""
app/gis — AI-PUNARVAS GIS and Spatial Data Layer
"""

from app.gis.open_data_pipeline import (
    fetch_real_villages,
    enrich_village,
    ingest_district,
    fetch_real_relocation_sites,
    DISTRICT_BBOX,
    DISTRICT_TERRAIN,
)
from app.gis.real_data import (
    get_elevation,
    get_elevations_batch,
    get_current_rainfall,
    get_historical_annual_rainfall,
    get_soil_moisture,
    get_earthquakes_near,
    get_infrastructure_near,
    geocode_place,
    reverse_geocode,
    enrich_habitation_with_real_data,
    enrich_site_with_real_data,
)
from app.gis.processor import GISProcessor

__all__ = [
    "fetch_real_villages",
    "enrich_village",
    "ingest_district",
    "fetch_real_relocation_sites",
    "DISTRICT_BBOX",
    "DISTRICT_TERRAIN",
    "get_elevation",
    "get_elevations_batch",
    "get_current_rainfall",
    "get_historical_annual_rainfall",
    "get_soil_moisture",
    "get_earthquakes_near",
    "get_infrastructure_near",
    "geocode_place",
    "reverse_geocode",
    "enrich_habitation_with_real_data",
    "enrich_site_with_real_data",
    "GISProcessor",
]
