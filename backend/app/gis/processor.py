import math
from typing import Tuple, List, Dict, Any, Union
from shapely.geometry import Point, Polygon, mapping
import geojson


class GISProcessor:
    """
    Geospatial calculation engine for distance matrix calculations,
    spatial containment queries, risk buffers, and GeoJSON transformations.
    """

    EARTH_RADIUS_KM = 6371.0088

    @classmethod
    def compute_distance(
        cls,
        point1: Union[Tuple[float, float], Dict[str, float], List[float]],
        point2: Union[Tuple[float, float], Dict[str, float], List[float]],
    ) -> float:
        """
        Compute Great-Circle / Haversine distance between two coordinates in kilometers.
        Accepts (lat, lon) tuples, lists, or dicts with 'latitude'/'longitude' or 'lat'/'lon'.
        """
        lat1, lon1 = cls._extract_lat_lon(point1)
        lat2, lon2 = cls._extract_lat_lon(point2)

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(cls.EARTH_RADIUS_KM * c, 3)

    @staticmethod
    def _extract_lat_lon(point: Any) -> Tuple[float, float]:
        """Normalize coordinates to (lat, lon)."""
        if isinstance(point, (tuple, list)):
            return float(point[0]), float(point[1])
        elif isinstance(point, dict):
            lat = point.get("latitude") if point.get("latitude") is not None else point.get("lat")
            lon = point.get("longitude") if point.get("longitude") is not None else point.get("lon")
            if lat is not None and lon is not None:
                return float(lat), float(lon)
        raise ValueError(f"Unable to extract latitude and longitude from: {point}")

    @classmethod
    def point_in_polygon(
        cls,
        point: Union[Tuple[float, float], Dict[str, float]],
        polygon_coords: List[List[float]],
    ) -> bool:
        """
        Determine if geographic coordinate point lies within boundary polygon.
        Note: polygon_coords are in GeoJSON standard [lon, lat] format.
        """
        lat, lon = cls._extract_lat_lon(point)
        pt = Point(lon, lat)
        poly = Polygon(polygon_coords)
        return poly.contains(pt)

    @classmethod
    def buffer_zone(
        cls,
        point: Union[Tuple[float, float], Dict[str, float]],
        radius_km: float,
        resolution: int = 16,
    ) -> Dict[str, Any]:
        """
        Generate circular buffer zone around a geographic point in GeoJSON format.
        Converts kilometer radius to approximate spherical degree offsets.
        """
        lat, lon = cls._extract_lat_lon(point)
        # 1 degree latitude ~ 111.139 km
        # 1 degree longitude ~ 111.139 * cos(lat) km
        deg_lat = radius_km / 111.139
        deg_lon = radius_km / (111.139 * math.cos(math.radians(lat)) + 1e-6)

        # Generate smooth circular polygon vertices in [lon, lat] order
        coords = []
        for i in range(resolution):
            angle = (2.0 * math.pi * i) / resolution
            d_lat = deg_lat * math.sin(angle)
            d_lon = deg_lon * math.cos(angle)
            coords.append([round(lon + d_lon, 6), round(lat + d_lat, 6)])
        # Close the polygon ring
        coords.append(coords[0])

        poly = Polygon(coords)
        return mapping(poly)

    @classmethod
    def generate_risk_polygons(
        cls,
        habitations: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate GeoJSON FeatureCollection containing colored risk zones around settlements.
        Radius and color correlate with multi-hazard score and priority classification.
        """
        features = []

        for hab in habitations:
            lat = hab.get("latitude")
            lon = hab.get("longitude")
            if lat is None or lon is None:
                continue

            score = float(hab.get("multihazard_score", 0.0))
            priority = str(hab.get("priority_level", "SAFE")).upper()

            # Assign spatial buffer radius and styling based on hazard severity
            if priority == "IMMEDIATE":
                radius_km = 1.6
                fill_color = "#dc2626"  # Red
                fill_opacity = 0.45
                stroke_color = "#991b1b"
            elif priority == "HIGH":
                radius_km = 1.1
                fill_color = "#ea580c"  # Orange
                fill_opacity = 0.40
                stroke_color = "#c2410c"
            elif priority == "PHASED":
                radius_km = 0.75
                fill_color = "#eab308"  # Yellow
                fill_opacity = 0.35
                stroke_color = "#ca8a04"
            else:
                radius_km = 0.45
                fill_color = "#16a34a"  # Green
                fill_opacity = 0.25
                stroke_color = "#15803d"

            poly_geom = cls.buffer_zone((lat, lon), radius_km)

            feature = {
                "type": "Feature",
                "geometry": poly_geom,
                "properties": {
                    "id": hab.get("id"),
                    "habitation_id": hab.get("id"),
                    "name": hab.get("name"),
                    "district": hab.get("district"),
                    "state": hab.get("state"),
                    "population": hab.get("population"),
                    "multihazard_score": score,
                    "flood_score": hab.get("flood_score"),
                    "landslide_score": hab.get("landslide_score"),
                    "priority_level": priority,
                    "radius_km": radius_km,
                    "fill_color": fill_color,
                    "fill_opacity": fill_opacity,
                    "stroke_color": stroke_color,
                    "stroke_width": 2,
                },
            }
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    @classmethod
    def habitations_to_geojson(cls, habitations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert habitations list into GeoJSON FeatureCollection of points."""
        features = []
        for h in habitations:
            lat = h.get("latitude")
            lon = h.get("longitude")
            if lat is None or lon is None:
                continue

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat)],
                },
                "properties": {
                    "id": h.get("id"),
                    "name": h.get("name"),
                    "district": h.get("district"),
                    "state": h.get("state"),
                    "population": h.get("population"),
                    "flood_score": h.get("flood_score"),
                    "landslide_score": h.get("landslide_score"),
                    "multihazard_score": h.get("multihazard_score"),
                    "priority_level": h.get("priority_level"),
                    "confidence": h.get("confidence"),
                },
            })
        return {"type": "FeatureCollection", "features": features}

    @classmethod
    def sites_to_geojson(cls, sites: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert relocation sites list into GeoJSON FeatureCollection of points."""
        features = []
        for s in sites:
            lat = s.get("latitude")
            lon = s.get("longitude")
            if lat is None or lon is None:
                continue

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat)],
                },
                "properties": {
                    "id": s.get("id"),
                    "name": s.get("name"),
                    "district": s.get("district"),
                    "state": s.get("state"),
                    "area_hectares": s.get("area_hectares"),
                    "capacity_score": s.get("capacity_score"),
                    "overall_capacity": s.get("overall_capacity"),
                    "water_access": s.get("water_access"),
                    "road_connectivity_km": s.get("road_connectivity_km"),
                    "status": s.get("status"),
                },
            })
        return {"type": "FeatureCollection", "features": features}
