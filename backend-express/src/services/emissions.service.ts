// Emission factors in kg CO2e per km
const EMISSION_FACTORS: Record<string, number> = {
  walk: 0.0,
  bike: 0.0,
  scooter: 0.021,
  bus: 0.105,
  car_gas: 0.192,
  car_hybrid: 0.120,
  car_ev: 0.050,
};

export interface CommuteItem {
  mode: string;
  distance_km: number;
  date: string;
}

export interface EmissionResult {
  total_kg: number;
  by_mode_kg: Record<string, number>;
  factors: Record<string, number>;
}

export class EmissionsService {
  compute(items: CommuteItem[]): EmissionResult {
    let total = 0.0;
    const byMode: Record<string, number> = {};

    for (const item of items) {
      const factor = EMISSION_FACTORS[item.mode] ?? 0.15; // default fallback
      const co2 = factor * item.distance_km;
      total += co2;
      byMode[item.mode] = (byMode[item.mode] ?? 0) + co2;
    }

    return {
      total_kg: Number(total.toFixed(3)),
      by_mode_kg: Object.fromEntries(
        Object.entries(byMode).map(([k, v]) => [k, Number(v.toFixed(3))])
      ),
      factors: EMISSION_FACTORS,
    };
  }
}

export const emissionsService = new EmissionsService();

