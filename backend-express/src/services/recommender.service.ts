import axios from 'axios';

export interface RouteOption {
  mode?: string;
  summary?: string;
  duration_min?: number;
  transfers?: number;
  co2_kg?: number;
  type?: string;
}

export interface RecommendRequest {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  prefs?: {
    eco?: boolean;
    fastest?: boolean;
    least_transfers?: boolean;
  };
}

export interface RecommendResponse {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  options: RouteOption[];
}

// Mode factors (speed km/min, CO₂ kg/km)
const SPEEDS: Record<string, number> = {
  walk: 0.083, // 5 km/h
  bike: 0.25, // 15 km/h
  scooter: 0.3, // 18 km/h
  bus: 0.35, // 21 km/h
  train: 0.75, // 45 km/h
  car_gas: 0.8, // 48 km/h
  car_hybrid: 0.8,
  car_ev: 0.8,
};

const CO2: Record<string, number> = {
  walk: 0.0,
  bike: 0.0,
  scooter: 0.021,
  bus: 0.105,
  train: 0.041,
  car_gas: 0.192,
  car_hybrid: 0.120,
  car_ev: 0.050,
};

export class RecommenderService {
  private formatLocation(loc: string | { lat: number; lng: number }): string {
    if (typeof loc === 'string') {
      return loc;
    }
    return `${loc.lat},${loc.lng}`;
  }

  async recommend(request: RecommendRequest): Promise<RecommendResponse> {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    let distanceKm = 5.0;
    let durationMin = 10.0;

    // Try to get real distance from Google Maps if API key is available
    if (googleApiKey) {
      try {
        const originStr = this.formatLocation(request.origin);
        const destStr = this.formatLocation(request.destination);

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          {
            params: {
              origin: originStr,
              destination: destStr,
              mode: 'driving',
              alternatives: 'false',
              key: googleApiKey,
            },
            timeout: 8000,
          }
        );

        if (response.status === 200 && response.data.status === 'OK' && response.data.routes?.[0]) {
          const leg = response.data.routes[0].legs[0];
          distanceKm = leg.distance.value / 1000;
          durationMin = leg.duration.value / 60;
        }
      } catch (error) {
        console.warn('Google Directions API call failed, using defaults:', error);
      }
    }

    // Generate options for all modes
    const options: RouteOption[] = [];
    const modes = ['walk', 'bike', 'scooter', 'bus', 'train', 'car_gas', 'car_hybrid', 'car_ev'];

    for (const mode of modes) {
      const speed = SPEEDS[mode] ?? 0.5;
      const dur = Math.max(1, distanceKm / speed);
      const co2Kg = Number((distanceKm * (CO2[mode] ?? 0.15)).toFixed(3));
      const transfers = mode.includes('car') ? 0 : mode === 'bus' || mode === 'train' ? 1 : 0;

      options.push({
        mode,
        summary: mode.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        duration_min: Number(dur.toFixed(1)),
        transfers,
        co2_kg: co2Kg,
        type: mode,
      });
    }

    // Sort by emissions (eco-first)
    options.sort((a, b) => (a.co2_kg ?? 0) - (b.co2_kg ?? 0));

    return {
      origin: request.origin,
      destination: request.destination,
      options,
    };
  }
}

export const recommenderService = new RecommenderService();

