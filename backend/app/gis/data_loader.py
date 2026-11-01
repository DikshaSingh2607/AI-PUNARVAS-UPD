from typing import Dict, List, Any
from datetime import datetime, timedelta
import random


class DataLoader:
    """
    Geospatial synthetic data generator for AI-PUNARVAS disaster planning.
    Provides realistic habitation settlements, candidate relocation sites,
    and historical hazard events across vulnerable Indian districts.
    """

    DISTRICT_CONFIGS = {
        "Wayanad": {
            "state": "Kerala",
            "lat_bounds": (11.52, 11.85),
            "lon_bounds": (75.98, 76.28),
            "habitations": [
                {"name": "Chooralmala", "lat": 11.5367, "lon": 76.1685, "pop": 840, "elev": 920, "slope": 34.5, "river_dist": 65},
                {"name": "Mundakkai", "lat": 11.5284, "lon": 76.1821, "pop": 620, "elev": 1050, "slope": 38.0, "river_dist": 40},
                {"name": "Meppadi Ward-11", "lat": 11.5542, "lon": 76.1287, "pop": 510, "elev": 890, "slope": 26.0, "river_dist": 140},
                {"name": "Attamala Colony", "lat": 11.5192, "lon": 76.1953, "pop": 320, "elev": 1120, "slope": 41.0, "river_dist": 80},
                {"name": "Vythiri Hill Sector", "lat": 11.5498, "lon": 76.0412, "pop": 430, "elev": 780, "slope": 28.5, "river_dist": 190},
                {"name": "Pozhuthana Valley", "lat": 11.6021, "lon": 76.0184, "pop": 390, "elev": 730, "slope": 22.0, "river_dist": 110},
                {"name": "Vellamunda Streamside", "lat": 11.7345, "lon": 75.9521, "pop": 290, "elev": 760, "slope": 18.0, "river_dist": 95},
                {"name": "Padinjarathara Basin", "lat": 11.6782, "lon": 75.9834, "pop": 480, "elev": 740, "slope": 16.5, "river_dist": 130},
                {"name": "Mananthavady Riverside", "lat": 11.8023, "lon": 76.0041, "pop": 710, "elev": 720, "slope": 12.0, "river_dist": 50},
                {"name": "Sulthan Bathery Slopes", "lat": 11.6621, "lon": 76.2573, "pop": 360, "elev": 880, "slope": 24.0, "river_dist": 280},
            ],
            "sites": [
                {"name": "Kalpetta Safe Plateau Site-A", "lat": 11.6150, "lon": 76.0820, "area": 18.5, "water": True, "road_km": 0.4},
                {"name": "Meenangadi Resettlement Hub", "lat": 11.6580, "lon": 76.1720, "area": 24.0, "water": True, "road_km": 0.2},
                {"name": "Ambalavayal Terraced Grounds", "lat": 11.6210, "lon": 76.2150, "area": 14.2, "water": True, "road_km": 0.8},
                {"name": "Panamaram Civic Buffer Site", "lat": 11.7210, "lon": 76.0750, "area": 16.0, "water": True, "road_km": 0.5},
            ],
        },
        "Chamoli": {
            "state": "Uttarakhand",
            "lat_bounds": (30.30, 30.68),
            "lon_bounds": (79.40, 79.80),
            "habitations": [
                {"name": "Joshimath Sunil Ward", "lat": 30.5562, "lon": 79.5645, "pop": 920, "elev": 1950, "slope": 33.0, "river_dist": 210},
                {"name": "Raini Village Upper", "lat": 30.4932, "lon": 79.7121, "pop": 310, "elev": 2040, "slope": 42.0, "river_dist": 45},
                {"name": "Tapovan Gorge Habitation", "lat": 30.4984, "lon": 79.6312, "pop": 440, "elev": 1820, "slope": 36.0, "river_dist": 30},
                {"name": "Helang Cliff Colony", "lat": 30.5281, "lon": 79.5124, "pop": 280, "elev": 1540, "slope": 39.5, "river_dist": 75},
                {"name": "Pipalkoti Riparian Ward", "lat": 30.4320, "lon": 79.4312, "pop": 580, "elev": 1260, "slope": 25.0, "river_dist": 60},
                {"name": "Ghat Nandakini Bank", "lat": 30.2641, "lon": 79.4489, "pop": 350, "elev": 1340, "slope": 29.0, "river_dist": 40},
                {"name": "Urgam Valley Settlement", "lat": 30.5821, "lon": 79.4891, "pop": 270, "elev": 2100, "slope": 31.0, "river_dist": 160},
                {"name": "Tharali River Terrace", "lat": 30.0621, "lon": 79.5012, "pop": 490, "elev": 1180, "slope": 21.0, "river_dist": 55},
                {"name": "Dewal Hill Pocket", "lat": 30.0782, "lon": 79.5891, "pop": 310, "elev": 1420, "slope": 34.0, "river_dist": 180},
                {"name": "Ghingran Ridge Village", "lat": 30.4124, "lon": 79.3512, "pop": 260, "elev": 1680, "slope": 27.5, "river_dist": 350},
            ],
            "sites": [
                {"name": "Gopeshwar South Terrace-1", "lat": 30.4110, "lon": 79.3320, "area": 15.0, "water": True, "road_km": 0.6},
                {"name": "Chamoli Kothiyalsain Plain", "lat": 30.3950, "lon": 79.3210, "area": 22.5, "water": True, "road_km": 0.3},
                {"name": "Birahi Stable Ridge Plateau", "lat": 30.4280, "lon": 79.3850, "area": 12.0, "water": True, "road_km": 1.1},
                {"name": "Nandaprayag Benchland Hub", "lat": 30.3340, "lon": 79.3280, "area": 17.5, "water": True, "road_km": 0.4},
            ],
        },
        "Rudraprayag": {
            "state": "Uttarakhand",
            "lat_bounds": (30.25, 30.72),
            "lon_bounds": (78.95, 79.25),
            "habitations": [
                {"name": "Kedarnath Valley Outpost", "lat": 30.7324, "lon": 79.0669, "pop": 210, "elev": 3450, "slope": 37.0, "river_dist": 35},
                {"name": "Gaurikund Riverside Base", "lat": 30.6512, "lon": 79.0278, "pop": 380, "elev": 1980, "slope": 44.0, "river_dist": 25},
                {"name": "Sonprayag Confluence", "lat": 30.6321, "lon": 78.9984, "pop": 420, "elev": 1750, "slope": 35.0, "river_dist": 20},
                {"name": "Guptkashi Hill Ward", "lat": 30.5234, "lon": 79.0782, "pop": 640, "elev": 1319, "slope": 28.0, "river_dist": 220},
                {"name": "Ukhimath Slopes", "lat": 30.5182, "lon": 79.0965, "pop": 530, "elev": 1310, "slope": 27.0, "river_dist": 280},
                {"name": "Agastyamuni Flood Basin", "lat": 30.3921, "lon": 78.9834, "pop": 760, "elev": 920, "slope": 14.0, "river_dist": 30},
                {"name": "Tilwara Mandakini Shore", "lat": 30.3451, "lon": 78.9712, "pop": 490, "elev": 860, "slope": 16.0, "river_dist": 40},
                {"name": "Chandrapuri Hamlet", "lat": 30.4312, "lon": 79.0123, "pop": 340, "elev": 980, "slope": 23.0, "river_dist": 50},
                {"name": "Syund Creek Settlement", "lat": 30.3721, "lon": 78.9412, "pop": 280, "elev": 1020, "slope": 32.0, "river_dist": 70},
                {"name": "Ransi High Elevation", "lat": 30.5982, "lon": 79.1823, "pop": 220, "elev": 2200, "slope": 38.0, "river_dist": 110},
            ],
            "sites": [
                {"name": "Rudraprayag Belni Terrace", "lat": 30.2910, "lon": 78.9850, "area": 19.0, "water": True, "road_km": 0.5},
                {"name": "Koteshwar Safe Benchland", "lat": 30.3020, "lon": 79.0120, "area": 15.5, "water": True, "road_km": 0.7},
                {"name": "Jakholi Agricultural Plateau", "lat": 30.3250, "lon": 78.9150, "area": 26.0, "water": True, "road_km": 0.3},
                {"name": "Mayali Safe Community Zone", "lat": 30.3620, "lon": 78.9050, "area": 18.0, "water": True, "road_km": 0.4},
            ],
        },
        "Idukki": {
            "state": "Kerala",
            "lat_bounds": (9.78, 10.22),
            "lon_bounds": (76.88, 77.25),
            "habitations": [
                {"name": "Pettimudi Tea Division", "lat": 10.1582, "lon": 77.0182, "pop": 460, "elev": 1560, "slope": 39.0, "river_dist": 60},
                {"name": "Rajakkad Escarpment", "lat": 9.9832, "lon": 77.0892, "pop": 520, "elev": 1020, "slope": 32.0, "river_dist": 140},
                {"name": "Munnar Old Town Slopes", "lat": 10.0892, "lon": 77.0597, "pop": 820, "elev": 1530, "slope": 29.0, "river_dist": 50},
                {"name": "Devikulam Hills", "lat": 10.0621, "lon": 77.1021, "pop": 370, "elev": 1640, "slope": 34.0, "river_dist": 120},
                {"name": "Chinnakanal Ridge Ward", "lat": 10.0210, "lon": 77.1523, "pop": 340, "elev": 1480, "slope": 31.0, "river_dist": 180},
                {"name": "Adimali Riverfront Colony", "lat": 10.0124, "lon": 76.9541, "pop": 610, "elev": 520, "slope": 21.0, "river_dist": 45},
                {"name": "Kattappana Periyar Edge", "lat": 9.7541, "lon": 77.1124, "pop": 690, "elev": 890, "slope": 18.0, "river_dist": 80},
                {"name": "Peerumade Hill Crest", "lat": 9.5821, "lon": 76.9942, "pop": 380, "elev": 950, "slope": 27.0, "river_dist": 210},
                {"name": "Vagamon Valley Basin", "lat": 9.6892, "lon": 76.9051, "pop": 430, "elev": 1100, "slope": 23.0, "river_dist": 160},
                {"name": "Nedumkandam Outskirts", "lat": 9.8321, "lon": 77.1421, "pop": 450, "elev": 910, "slope": 19.5, "river_dist": 230},
            ],
            "sites": [
                {"name": "Painavu District HQ Terrace", "lat": 9.8450, "lon": 76.9420, "area": 20.0, "water": True, "road_km": 0.3},
                {"name": "Cheruthoni Safe Upland Zone", "lat": 9.8720, "lon": 76.9850, "area": 25.5, "water": True, "road_km": 0.4},
                {"name": "Thodupuzha Foothill Haven", "lat": 9.8950, "lon": 76.7120, "area": 32.0, "water": True, "road_km": 0.2},
                {"name": "Nedumkandam North Plateau", "lat": 9.8520, "lon": 77.1280, "area": 16.5, "water": True, "road_km": 0.5},
            ],
        },
        "Uttarkashi": {
            "state": "Uttarakhand",
            "lat_bounds": (30.68, 31.05),
            "lon_bounds": (78.38, 78.85),
            "habitations": [
                {"name": "Bhatwari Bhagirathi Edge", "lat": 30.8124, "lon": 78.6189, "pop": 540, "elev": 1220, "slope": 36.0, "river_dist": 30},
                {"name": "Harsil Valley Sector", "lat": 31.0345, "lon": 78.7365, "pop": 380, "elev": 2620, "slope": 28.0, "river_dist": 50},
                {"name": "Dharali Streamside", "lat": 31.0412, "lon": 78.7521, "pop": 310, "elev": 2680, "slope": 35.0, "river_dist": 35},
                {"name": "Gangori Flood Confluence", "lat": 30.7512, "lon": 78.4489, "pop": 620, "elev": 1150, "slope": 22.0, "river_dist": 25},
                {"name": "Dunda Lowland", "lat": 30.6821, "lon": 78.3412, "pop": 470, "elev": 980, "slope": 15.0, "river_dist": 45},
                {"name": "Barkot Yamuna Escarpment", "lat": 30.8123, "lon": 78.2054, "pop": 580, "elev": 1240, "slope": 29.0, "river_dist": 60},
                {"name": "Purola Terraced Settlement", "lat": 30.8841, "lon": 78.0823, "pop": 410, "elev": 1520, "slope": 21.0, "river_dist": 140},
                {"name": "Mori Tons Valley Pocket", "lat": 31.0212, "lon": 78.0412, "pop": 290, "elev": 1410, "slope": 33.0, "river_dist": 40},
                {"name": "Netwar Steep Slopes", "lat": 31.0452, "lon": 78.1124, "pop": 240, "elev": 1580, "slope": 38.0, "river_dist": 55},
                {"name": "Chinyalisaur Shoreline", "lat": 30.5621, "lon": 78.3120, "pop": 660, "elev": 820, "slope": 12.0, "river_dist": 30},
            ],
            "sites": [
                {"name": "Uttarkashi Tiloth Benchland", "lat": 30.7380, "lon": 78.4320, "area": 18.0, "water": True, "road_km": 0.4},
                {"name": "Matli Paramilitary Plain", "lat": 30.7150, "lon": 78.4050, "area": 28.5, "water": True, "road_km": 0.2},
                {"name": "Chinyalisaur Airstrip Plateau", "lat": 30.5750, "lon": 78.3280, "area": 35.0, "water": True, "road_km": 0.1},
                {"name": "Barkot North Resettlement Zone", "lat": 30.8250, "lon": 78.2180, "area": 16.0, "water": True, "road_km": 0.6},
            ],
        },
    }

    HAZARD_EVENTS = [
        {
            "name": "2024 Wayanad Meppadi Debris Flow & Landslide",
            "type": "LANDSLIDE",
            "severity": "CRITICAL",
            "district": "Wayanad",
            "state": "Kerala",
            "latitude": 11.5367,
            "longitude": 76.1685,
            "date": datetime(2024, 7, 30, 2, 15),
            "affected_habitations": ["Chooralmala", "Mundakkai", "Attamala Colony"],
        },
        {
            "name": "2021 Chamoli Glacier Burst & Flash Flood",
            "type": "FLOOD",
            "severity": "CRITICAL",
            "district": "Chamoli",
            "state": "Uttarakhand",
            "latitude": 30.4932,
            "longitude": 79.7121,
            "date": datetime(2021, 2, 7, 10, 20),
            "affected_habitations": ["Raini Village Upper", "Tapovan Gorge Habitation"],
        },
        {
            "name": "2013 Kedarnath Mandakini Cloudburst Deluge",
            "type": "FLOOD",
            "severity": "CRITICAL",
            "district": "Rudraprayag",
            "state": "Uttarakhand",
            "latitude": 30.6512,
            "longitude": 79.0278,
            "date": datetime(2013, 6, 16, 19, 0),
            "affected_habitations": ["Gaurikund Riverside Base", "Sonprayag Confluence", "Agastyamuni Flood Basin"],
        },
        {
            "name": "2020 Pettimudi Monsoon Landslide",
            "type": "LANDSLIDE",
            "severity": "HIGH",
            "district": "Idukki",
            "state": "Kerala",
            "latitude": 10.1582,
            "longitude": 77.0182,
            "date": datetime(2020, 8, 6, 22, 45),
            "affected_habitations": ["Pettimudi Tea Division", "Munnar Old Town Slopes"],
        },
        {
            "name": "2012 Uttarkashi Assi Ganga Flash Flood Event",
            "type": "FLOOD",
            "severity": "HIGH",
            "district": "Uttarkashi",
            "state": "Uttarakhand",
            "latitude": 30.7512,
            "longitude": 78.4489,
            "date": datetime(2012, 8, 4, 1, 30),
            "affected_habitations": ["Gangori Flood Confluence", "Bhatwari Bhagirathi Edge"],
        },
    ]

    @classmethod
    def load_synthetic_data(cls) -> Dict[str, Any]:
        """
        Generate complete synthetic dataset for initial system priming.
        Returns habitations (50), sites (20), and hazard events (5).
        """
        habitations = []
        sites = []

        # 1. Build Habitations
        hab_id = 1
        for district, cfg in cls.DISTRICT_CONFIGS.items():
            state = cfg["state"]
            for h in cfg["habitations"]:
                # Hydrological and terrain properties
                elev = float(h["elev"])
                slp = float(h["slope"])
                riv_dist = float(h["river_dist"])
                
                # Annual rainfall based on geographic region
                is_kerala = state == "Kerala"
                rainfall = 3400.0 + random.uniform(-300, 500) if is_kerala else 1850.0 + random.uniform(-250, 400)
                soil_moisture = random.uniform(65, 88) if is_kerala else random.uniform(55, 82)
                rainfall_intensity = random.uniform(55, 110) if is_kerala else random.uniform(40, 95)
                
                hab_record = {
                    "id": hab_id,
                    "name": h["name"],
                    "district": district,
                    "state": state,
                    "population": int(h["pop"]),
                    "latitude": float(h["lat"]),
                    "longitude": float(h["lon"]),
                    "elevation": elev,
                    "slope": slp,
                    "distance_to_river": riv_dist,
                    "rainfall_annual": round(rainfall, 1),
                    "soil_type": "clay" if slp > 30 else ("silt" if riv_dist < 100 else "loam"),
                    "ndvi": round(random.uniform(0.35, 0.78), 2),
                    "land_use_type": "settlement",
                    "slope_angle": slp,
                    "soil_moisture": round(soil_moisture, 1),
                    "vegetation_cover": round(random.uniform(0.30, 0.75), 2),
                    "distance_to_fault": round(random.uniform(200.0, 3200.0), 1),
                    "rainfall_intensity": round(rainfall_intensity, 1),
                }
                habitations.append(hab_record)
                hab_id += 1

        # 2. Build Relocation Sites
        site_id = 1
        for district, cfg in cls.DISTRICT_CONFIGS.items():
            state = cfg["state"]
            for s in cfg["sites"]:
                area = float(s["area"])
                water = bool(s["water"])
                road_km = float(s["road_km"])
                
                site_record = {
                    "id": site_id,
                    "name": s["name"],
                    "district": district,
                    "state": state,
                    "latitude": float(s["lat"]),
                    "longitude": float(s["lon"]),
                    "area_hectares": area,
                    "water_access": water,
                    "road_connectivity_km": road_km,
                    "livelihood_score": round(random.uniform(0.72, 0.94), 2),
                    "land_score": round(random.uniform(0.78, 0.96), 2),
                    "infrastructure_score": round(random.uniform(0.68, 0.92), 2),
                    "status": "VETTED" if site_id % 3 != 0 else "PENDING",
                }
                sites.append(site_record)
                site_id += 1

        # 3. Hazard Events
        events = []
        for idx, ev in enumerate(cls.HAZARD_EVENTS, 1):
            events.append({
                "id": idx,
                "name": ev["name"],
                "type": ev["type"],
                "severity": ev["severity"],
                "latitude": ev["latitude"],
                "longitude": ev["longitude"],
                "date": ev["date"],
                "affected_habitations": ev["affected_habitations"],
            })

        return {
            "habitations": habitations,
            "sites": sites,
            "hazard_events": events,
        }
