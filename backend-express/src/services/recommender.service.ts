import axios from 'axios';

export interface RouteOption {
  mode?: string;
  summary?: string;
  duration_min?: number;
  transfers?: number;
  co2_kg?: number;
  type?: string;
  cost_usd?: number;
  overall?: number;
}

export interface RecommendRequest {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  // New: numeric priorities 1 (highest), 2, 3 (lowest)
  prefs?: {
    ecoPriority?: 1 | 2 | 3;
    speedPriority?: 1 | 2 | 3;
    costPriority?: 1 | 2 | 3;
  };
}

export interface RecommendResponse {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  options: RouteOption[];
}

// Mode factors (speed km/min, CO₂ kg/km)
const SPEEDS: Record<string, number> = {
  walk: 0.083,   // 5 km/h
  bike: 0.25,    // 15 km/h
  scooter: 0.3,  // 18 km/h
  bus: 0.35,     // 21 km/h
  car_gas: 0.8,  // 48 km/h
  car_hybrid: 0.8,
  car_ev: 0.8,
};

const CO2: Record<string, number> = {
  walk: 0.0,
  bike: 0.0,
  scooter: 0.021,
  bus: 0.105,
  car_gas: 0.192,
  car_hybrid: 0.120,
  car_ev: 0.050,
};

// Very simple cost model (USD per km)
const COST_PER_KM: Record<string, number> = {
  walk: 0,
  bike: 0,
  scooter: 0.05,
  bus: 0.25,
  car_gas: 0.35,
  car_hybrid: 0.28,
  car_ev: 0.18,
};

// User-friendly labels for modes
const MODE_LABELS: Record<string, string> = {
  walk: 'Walking',
  bike: 'Biking',
  scooter: 'Scooter',
  bus: 'Bus',
  car_gas: 'Gas Car',
  car_hybrid: 'Hybrid Car',
  car_ev: 'Electric Car (EV)',
};

function rankAscending(values: number[]): number[] {
  const pairs = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = Array(values.length).fill(0);
  let currentRank = 1;

  for (let idx = 0; idx < pairs.length; idx++) {
    if (idx > 0 && pairs[idx].v !== pairs[idx - 1].v) {
      currentRank = idx + 1;
    }
    ranks[pairs[idx].i] = currentRank;
  }
  return ranks;
}

// Turn a rank (1 best … maxRank worst) into 0–1 score (1 is best)
function normalizedScore(rank: number, maxRank: number): number {
  if (maxRank <= 1) return 1;
  return 1 - (rank - 1) / (maxRank - 1);
}

function weightForPriority(priority: 1 | 2 | 3): number {
  if (priority === 1) return 1.0;
  if (priority === 2) return 0.7;
  return 0.5; // priority 3
}

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

        if (
          response.status === 200 &&
          response.data.status === 'OK' &&
          response.data.routes?.[0]
        ) {
          const leg = response.data.routes[0].legs[0];
          distanceKm = leg.distance.value / 1000;
          durationMin = leg.duration.value / 60;
        }
      } catch (error) {
        console.warn(
          'Google Directions API call failed, using defaults:',
          (error as Error).message ?? error
        );
      }
    }

    // Generate options for all modes
    const options: RouteOption[] = [];
    const modes = ['walk', 'bike', 'scooter', 'bus', 'car_gas', 'car_hybrid', 'car_ev'];

    for (const mode of modes) {
      const speed = SPEEDS[mode] ?? 0.5;
      const dur = Math.max(1, distanceKm / speed);
      const co2Kg = Number((distanceKm * (CO2[mode] ?? 0.15)).toFixed(3));
      const transfers = mode.includes('car') ? 0 : mode === 'bus' ? 1 : 0;
      const costUsd = Number((distanceKm * (COST_PER_KM[mode] ?? 0.3)).toFixed(2));

      options.push({
        mode,
        summary: MODE_LABELS[mode] ?? mode.replace('_', ' '),
        duration_min: Number(dur.toFixed(1)),
        transfers,
        co2_kg: co2Kg,
        type: mode,
        cost_usd: costUsd,
      });
    }

    // ------------- Customizable overall scoring -------------

     // If no options somehow, just return early
    if (!options.length) {
      return {
        origin: request.origin,
        destination: request.destination,
        options,
      };
    }

    // ---- Helpers ----
    function weightFromPriority(p: 1 | 2 | 3): number {
      // 1 = most important, 3 = least important
      if (p === 1) return 0.44;
      if (p === 2) return 0.33;
      return 0.23; // p === 3
    }

    function normalize(value: number, min: number, max: number, invert = false): number {
      if (!Number.isFinite(value)) return 0.5;
      if (max === min) return 1; // all the same -> treat as equally good
      const t = (value - min) / (max - min);
      return invert ? 1 - t : t;
    }

    function softenEco(score: number): number {
      // concave curve: compress very high eco scores
      // so "perfectly green" doesn't completely dominate others
      return Math.sqrt(Math.max(0, Math.min(1, score)));
    }

    // ---- Build raw metric arrays ----
    const ecoVals: number[] = options.map(o => o.co2_kg ?? 0);

    // Approximate speed in km/h using the common distanceKm baseline
    const speedVals: number[] = options.map(o => {
      const dur = o.duration_min ?? durationMin; // minutes
      return dur > 0 ? (distanceKm / dur) * 60 : 0; // km/h
    });

    const costVals: number[] = options.map(o => o.cost_usd ?? 0);

    const minEco = Math.min(...ecoVals);
    const maxEco = Math.max(...ecoVals);
    const minSpeed = Math.min(...speedVals);
    const maxSpeed = Math.max(...speedVals);
    const minCost = Math.min(...costVals);
    const maxCost = Math.max(...costVals);

    // ---- Priorities (from request, with defaults) ----
    const ecoPriority: 1 | 2 | 3 = request.prefs?.ecoPriority ?? 1;
    const speedPriority: 1 | 2 | 3 = request.prefs?.speedPriority ?? 2;
    const costPriority: 1 | 2 | 3 = request.prefs?.costPriority ?? 3;

    const ecoWeight = weightFromPriority(ecoPriority);
    const speedWeight = weightFromPriority(speedPriority);
    const costWeight = weightFromPriority(costPriority);

    // ---- Per-option scores ----
    options.forEach((opt, idx) => {
      const ecoRaw = ecoVals[idx];
      const speedRaw = speedVals[idx];
      const costRaw = costVals[idx];

      // eco: lower CO₂ is better → invert = true
      const ecoNorm = normalize(ecoRaw, minEco, maxEco, true);
      const ecoScore = softenEco(ecoNorm);

      // speed: higher km/h is better → invert = false
      const speedScore = normalize(speedRaw, minSpeed, maxSpeed, false);

      // cost: lower cost is better → invert = true
      const costScore = normalize(costRaw, minCost, maxCost, true);

      const overall =
        ecoWeight   * ecoScore +
        speedWeight * speedScore +
        costWeight  * costScore;

      (opt as any).overall = Number(overall.toFixed(3));
    });

    // Sort by overall descending (higher = better)
    options.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

    return {
      origin: request.origin,
      destination: request.destination,
      options,
    };
  }
}

export const recommenderService = new RecommenderService();
