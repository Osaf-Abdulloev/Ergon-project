import math
import os
import re
from typing import Optional, Dict, Any, Tuple
import httpx

# Predefined coordinates for key Tajikistan cities, districts, microdistricts, and streets
KNOWN_LOCATIONS: Dict[str, Tuple[float, float]] = {
    # Dushanbe Center & Districts
    "душанбе": (38.5598, 68.7870),
    "рудаки": (38.5650, 68.7880),
    "сомони": (38.5830, 68.7830),
    "исмоили сомони": (38.5830, 68.7830),
    "шохмансур": (38.5550, 68.8050),
    "сино": (38.5720, 68.7450),
    "фирдавси": (38.5250, 68.7750),
    "садбарг": (38.5580, 68.7980),
    "водонасос": (38.6100, 68.7820),
    "корвон": (38.5020, 68.7620),
    "карабоев": (38.5410, 68.7720),
    "заарафшон": (38.5810, 68.7210),
    "зарафшон": (38.5810, 68.7210),
    "гипрозем": (38.5210, 68.7410),
    "профсоюз": (38.5680, 68.7560),
    "автовокзал": (38.5620, 68.7650),
    "цирк": (38.5510, 68.7780),
    "пединститут": (38.5790, 68.7880),
    "сельхоз": (38.5980, 68.7850),
    
    # Microdistricts (мкр)
    "82 мкр": (38.5690, 68.7420),
    "83 мкр": (38.5660, 68.7380),
    "84 мкр": (38.5730, 68.7350),
    "101 мкр": (38.5780, 68.7310),
    "102 мкр": (38.5820, 68.7280),
    "33 мкр": (38.5380, 68.7720),
    "46 мкр": (38.5310, 68.7750),
    "61 мкр": (38.5210, 68.7810),
    "63 мкр": (38.5280, 68.7850),
    "65 мкр": (38.5190, 68.7880),
    "91 мкр": (38.5850, 68.7480),
    "92 мкр": (38.5880, 68.7450),

    # Other Tajikistan Cities
    "худжанд": (40.2826, 69.6222),
    "бохтар": (37.8361, 68.7803),
    "курган-тюбе": (37.8361, 68.7803),
    "кулоб": (37.9146, 69.7820),
    "кульаб": (37.9146, 69.7820),
    "истаравшан": (39.9142, 69.0034),
    "турсунзаде": (38.5127, 68.2323),
    "турсунзода": (38.5127, 68.2323),
    "вахдат": (38.5563, 69.0183),
    "гиссар": (38.5264, 68.5512),
    "хисор": (38.5264, 68.5512),
    "нурек": (38.3892, 69.3558),
    "норак": (38.3892, 69.3558),
    "пенджикент": (39.4952, 67.6094),
    "панджакент": (39.4952, 67.6094),
    "хорог": (37.4893, 71.5528),
    "хорог": (37.4893, 71.5528),
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in kilometers."""
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class LocationService:
    @staticmethod
    def geocode_address(address: Optional[str]) -> Optional[Tuple[float, float]]:
        """Resolve an address or location name to (lat, lng) coordinates."""
        if not address:
            return KNOWN_LOCATIONS["душанбе"]

        clean_addr = address.lower().strip()

        # Check explicit lat,lng format e.g. "38.56, 68.78"
        coord_match = re.search(r'(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)', clean_addr)
        if coord_match:
            try:
                return float(coord_match.group(1)), float(coord_match.group(2))
            except ValueError:
                pass

        # Check matched location keys in dictionary (longest match first)
        for key in sorted(KNOWN_LOCATIONS.keys(), key=len, reverse=True):
            if key in clean_addr:
                return KNOWN_LOCATIONS[key]

        # Default fallback to Dushanbe center
        return KNOWN_LOCATIONS["душанбе"]

    @staticmethod
    async def get_google_maps_commute(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, mode: str = "driving") -> Optional[Dict[str, Any]]:
        """Fetch real distance and ETA from Google Maps Distance Matrix API if API key is provided."""
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return None

        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                "origins": f"{origin_lat},{origin_lng}",
                "destinations": f"{dest_lat},{dest_lng}",
                "mode": mode,
                "key": api_key,
                "language": "ru"
            }
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    rows = data.get("rows", [])
                    if rows and rows[0].get("elements"):
                        elem = rows[0]["elements"][0]
                        if elem.get("status") == "OK":
                            dist_meters = elem["distance"]["value"]
                            dur_seconds = elem["duration"]["value"]
                            return {
                                "distance_km": round(dist_meters / 1000.0, 1),
                                "commute_minutes": max(1, round(dur_seconds / 60.0)),
                            }
        except Exception as e:
            print(f"Google Maps Distance Matrix API error: {e}")
        return None

    @classmethod
    def calculate_commute(
        cls,
        origin_location: Optional[str] = None,
        destination_location: Optional[str] = None,
        origin_lat: Optional[float] = None,
        origin_lng: Optional[float] = None,
        dest_lat: Optional[float] = None,
        dest_lng: Optional[float] = None,
        transport_mode: str = "car",
        is_remote: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate realistic road distance (km) and commute time (minutes) between origin and destination.
        """
        dest_str = (destination_location or "").lower()
        if is_remote or "удал" in dest_str or "online" in dest_str or "дистанци" in dest_str:
            return {
                "distance_km": 0.0,
                "distance_text": "0 км (Удаленно)",
                "commute_minutes": 0,
                "commute_text": "Удаленная работа",
                "transport_mode": transport_mode,
                "is_remote": True,
                "location_fit_score": 100
            }

        # Resolve Origin Coordinates
        if origin_lat is None or origin_lng is None:
            orig_coords = cls.geocode_address(origin_location)
            if orig_coords:
                origin_lat, origin_lng = orig_coords
            else:
                origin_lat, origin_lng = KNOWN_LOCATIONS["душанбе"]

        # Resolve Destination Coordinates
        if dest_lat is None or dest_lng is None:
            dest_coords = cls.geocode_address(destination_location)
            if dest_coords:
                dest_lat, dest_lng = dest_coords
            else:
                dest_lat, dest_lng = KNOWN_LOCATIONS["душанбе"]

        # 1. Direct Haversine Distance
        haversine_dist = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)

        # 2. Road Distance Calculation with Road Network Multiplier
        is_intercity = haversine_dist > 25.0
        road_multiplier = 1.25 if is_intercity else 1.38
        distance_km = round(max(0.5, haversine_dist * road_multiplier), 1)

        # 3. Real Commute Duration Calculation (Minutes)
        if is_intercity:
            # Highway driving speed ~ 70 km/h
            travel_hours = distance_km / 70.0
            commute_minutes = round(travel_hours * 60)
            if commute_minutes >= 120:
                hours = commute_minutes // 60
                mins = commute_minutes % 60
                commute_text = f"{hours} ч {mins} мин в пути (Межгород)" if mins > 0 else f"{hours} ч в пути (Межгород)"
            else:
                commute_text = f"{commute_minutes} мин в пути"
            distance_text = f"{distance_km} км (Релокация)"
            location_fit_score = 40
        else:
            # City commute logic based on transport mode
            if transport_mode == "walk":
                # Walking speed ~ 4.8 km/h
                commute_minutes = max(3, round((distance_km / 4.8) * 60))
            elif transport_mode == "transit":
                # Public transport average speed ~ 18 km/h + 6 min waiting/walking to stop
                commute_minutes = max(7, round((distance_km / 18.0) * 60 + 6))
            else:  # 'car' default
                # City driving speed ~ 26 km/h (including traffic lights) + 3 min parking/start
                commute_minutes = max(5, round((distance_km / 26.0) * 60 + 3))

            commute_text = f"~{commute_minutes} мин в пути"
            distance_text = f"~{distance_km} км от вас"
            
            if commute_minutes <= 20:
                location_fit_score = 98
            elif commute_minutes <= 35:
                location_fit_score = 85
            else:
                location_fit_score = 70

        return {
            "origin_location": origin_location or "Душанбе",
            "destination_location": destination_location or "Душанбе",
            "distance_km": distance_km,
            "distance_text": distance_text,
            "commute_minutes": commute_minutes,
            "commute_text": commute_text,
            "transport_mode": transport_mode,
            "is_remote": False,
            "location_fit_score": location_fit_score
        }
