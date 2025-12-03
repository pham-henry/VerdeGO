/**
 * Emission factors in kg CO2e per km
 * Based on real-world data from EPA, DEFRA, and transportation research
 * 
 * Sources:
 * - Walking/Biking: 0 (human-powered, no direct emissions)
 * - Electric Scooter: ~0.021 kg CO2e/km (electricity generation + manufacturing)
 * - Bus: ~0.105 kg CO2e/km (average public transit, varies by fuel type)
 * - Car (Gasoline): ~0.192 kg CO2e/km (average passenger vehicle, 28 MPG)
 * - Car (Hybrid): ~0.120 kg CO2e/km (gasoline-electric hybrid)
 * - Car (EV): ~0.050 kg CO2e/km (electric vehicle, grid-dependent)
 */
const EMISSION_FACTORS: Record<string, number> = {
  // Zero-emission modes (normalized keys)
  walk: 0.0,
  bike: 0.0,
  
  // Low-emission modes
  scooter: 0.021,
  
  // Public transit
  bus: 0.105,
  
  // Personal vehicles
  car_gas: 0.192,
  car_hybrid: 0.120,
  car_ev: 0.050,
  
  // Default fallback for unknown modes
  other: 0.15,
};

/**
 * Normalize mode names to a standard format
 * Handles variations like "Walk", "walk", "Walking", "Car (Gas)", etc.
 */
function normalizeMode(mode: string): string {
  if (!mode) return 'other';
  
  const normalized = mode.trim().toLowerCase();
  
  // Direct match (already normalized)
  if (EMISSION_FACTORS[normalized] !== undefined) {
    return normalized;
  }
  
  // Handle exact matches from frontend Logger component
  // "Walk" -> "walk"
  if (normalized === 'walk') return 'walk';
  
  // "Bike" -> "bike"
  if (normalized === 'bike') return 'bike';
  
  // "Scooter" -> "scooter"
  if (normalized === 'scooter') return 'scooter';
  
  // "Bus" -> "bus"
  if (normalized === 'bus') return 'bus';
  
  // "Car (Gas)" or "car (gas)" -> "car_gas"
  if (normalized === 'car (gas)' || normalized === 'car(gas)') return 'car_gas';
  
  // "Car (Hybrid)" or "car (hybrid)" -> "car_hybrid"
  if (normalized === 'car (hybrid)' || normalized === 'car(hybrid)') return 'car_hybrid';
  
  // "Car (EV)" or "car (ev)" -> "car_ev"
  if (normalized === 'car (ev)' || normalized === 'car(ev)') return 'car_ev';
  
  // Pattern matching for other variations
  if (normalized.includes('walk')) return 'walk';
  if (normalized.includes('bike') || normalized.includes('bicycle')) return 'bike';
  if (normalized.includes('scooter')) return 'scooter';
  if (normalized.includes('bus') || normalized.includes('transit')) return 'bus';
  
  // Car types - check for gas first (most common)
  if (normalized.includes('gas') && (normalized.includes('car') || normalized.includes('vehicle'))) {
    return 'car_gas';
  }
  if (normalized.includes('hybrid') && (normalized.includes('car') || normalized.includes('vehicle'))) {
    return 'car_hybrid';
  }
  if ((normalized.includes('ev') || normalized.includes('electric')) && 
      (normalized.includes('car') || normalized.includes('vehicle'))) {
    return 'car_ev';
  }
  
  return 'other';
}

/**
 * Get emission factor for a given mode
 */
function getEmissionFactor(mode: string): number {
  const normalized = normalizeMode(mode);
  return EMISSION_FACTORS[normalized] ?? EMISSION_FACTORS.other;
}

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
  /**
   * Calculate CO2 emissions for a list of commute items
   * 
   * @param items Array of commute items with mode, distance, and date
   * @returns Emission result with total, by mode, and factors
   */
  compute(items: CommuteItem[]): EmissionResult {
    let total = 0.0;
    const byMode: Record<string, number> = {};

    for (const item of items) {
      // Validate and sanitize inputs
      const distance = Number(item.distance_km);
      if (!Number.isFinite(distance) || distance < 0) {
        continue; // Skip invalid distances
      }

      // Get emission factor for this mode
      const factor = getEmissionFactor(item.mode);
      const normalizedMode = normalizeMode(item.mode);
      
      // Calculate CO2 emissions: factor (kg CO2e/km) × distance (km)
      const co2 = factor * distance;
      
      // Accumulate totals
      total += co2;
      byMode[normalizedMode] = (byMode[normalizedMode] ?? 0) + co2;
    }

    // Round to 3 decimal places for precision
    return {
      total_kg: Number(total.toFixed(3)),
      by_mode_kg: Object.fromEntries(
        Object.entries(byMode).map(([k, v]) => [k, Number(v.toFixed(3))])
      ),
      factors: {
        walk: 0.0,
        bike: 0.0,
        scooter: 0.021,
        bus: 0.105,
        car_gas: 0.192,
        car_hybrid: 0.120,
        car_ev: 0.050,
        other: 0.15,
      },
    };
  }

  /**
   * Get emission factor for a specific mode
   */
  getFactor(mode: string): number {
    return getEmissionFactor(mode);
  }

  /**
   * Normalize a mode name to standard format
   */
  normalizeMode(mode: string): string {
    return normalizeMode(mode);
  }
}

export const emissionsService = new EmissionsService();

