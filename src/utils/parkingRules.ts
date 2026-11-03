import { ParkingSpot, SpotType } from '../types/parking';

export interface FeeBreakdown {
  parkingFee: number;
  evFee: number;
  totalFee: number;
  discount: number;
}

/**
 * Calculates dynamic hourly pricing based on current occupancy and peak hour flag.
 */
export function calculateDynamicRate(baseRate: number, occupancyRatio: number, isPeakHour: boolean = false): number {
  if (baseRate < 0) return 0;
  let multiplier = 1.0;

  if (occupancyRatio >= 0.90) {
    multiplier = 1.75; // high congestion surge
  } else if (occupancyRatio >= 0.75) {
    multiplier = 1.40;
  } else if (occupancyRatio >= 0.50) {
    multiplier = 1.15;
  } else if (occupancyRatio < 0.25) {
    multiplier = 0.85; // off-peak discount
  }

  if (isPeakHour) {
    multiplier *= 1.25;
  }

  // Round to 2 decimals
  return Math.round(baseRate * multiplier * 100) / 100;
}

/**
 * Calculates the total accrued fee for a parking stay.
 * EV charging is billed per kWh ($0.35/kWh default) or $4/hr.
 */
export function calculateParkingFee(
  durationHours: number,
  hourlyRate: number,
  isEVCharging: boolean = false,
  energyKwh: number = 0,
  rateMultiplier: number = 1.0
): FeeBreakdown {
  const safeHours = Math.max(0, durationHours);
  const baseParkingFee = Math.round(safeHours * hourlyRate * rateMultiplier * 100) / 100;
  
  const evFee = isEVCharging
    ? Math.round(energyKwh > 0 ? energyKwh * 0.35 * 100 : safeHours * 4.0 * 100) / 100
    : 0;

  const subtotal = baseParkingFee + evFee;
  const discount = 0;
  const totalFee = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

  return {
    parkingFee: baseParkingFee,
    evFee,
    totalFee,
    discount,
  };
}

/**
 * Finds the optimal parking spot matching vehicle and driver needs.
 */
export function findBestSpot(
  spots: ParkingSpot[],
  criteria: {
    preferredLevel?: number;
    requiresEV?: boolean;
    requiresAccessible?: boolean;
    isVIP?: boolean;
    preferredSpotId?: string;
  }
): ParkingSpot | null {
  const availableSpots = spots.filter(s => s.status === 'available' && s.sensorHealth !== 'fault');
  if (availableSpots.length === 0) return null;

  if (criteria.preferredSpotId) {
    const directMatch = availableSpots.find(s => s.id === criteria.preferredSpotId || s.code === criteria.preferredSpotId);
    if (directMatch) return directMatch;
  }

  // Filter candidates matching hard constraints
  let candidates = availableSpots;

  if (criteria.requiresAccessible) {
    const accessible = candidates.filter(s => s.type === 'accessible');
    if (accessible.length > 0) candidates = accessible;
  } else if (criteria.requiresEV) {
    const evSpots = candidates.filter(s => s.type === 'ev');
    if (evSpots.length > 0) candidates = evSpots;
  } else if (criteria.isVIP) {
    const vipSpots = candidates.filter(s => s.type === 'vip');
    if (vipSpots.length > 0) candidates = vipSpots;
  } else {
    // Standard preference avoids accessible/vip/ev if normal spots exist
    const standardSpots = candidates.filter(s => s.type === 'standard' || s.type === 'compact');
    if (standardSpots.length > 0) candidates = standardSpots;
  }

  // Filter by preferred level if matches exist
  if (criteria.preferredLevel !== undefined) {
    const levelMatches = candidates.filter(s => s.level === criteria.preferredLevel);
    if (levelMatches.length > 0) {
      candidates = levelMatches;
    }
  }

  // Score candidates: lower distance from entry (x=0, z=-15) is better
  return candidates.sort((a, b) => {
    const distA = Math.hypot(a.x - 0, a.z - (-15));
    const distB = Math.hypot(b.x - 0, b.z - (-15));
    return distA - distB;
  })[0] || null;
}

/**
 * Summarizes current facility statistics.
 */
export function calculateFacilityStats(spots: ParkingSpot[]) {
  const total = spots.length;
  let occupied = 0;
  let available = 0;
  let reserved = 0;
  let evInUse = 0;

  for (const s of spots) {
    if (s.status === 'occupied') {
      occupied++;
      if (s.type === 'ev' && s.vehicle?.isEV) {
        evInUse++;
      }
    } else if (s.status === 'available') {
      available++;
    } else if (s.status === 'reserved') {
      reserved++;
    }
  }

  const occupancyRatio = total > 0 ? occupied / total : 0;

  return {
    total,
    occupied,
    available,
    reserved,
    evInUse,
    occupancyRatio,
  };
}

/**
 * Basic license plate sanitizer and validator (alphanumeric, 4 to 8 characters).
 */
export function validateLicensePlate(plate: string): boolean {
  if (!plate) return false;
  const clean = plate.trim().toUpperCase().replace(/[\s-]/g, '');
  return clean.length >= 4 && clean.length <= 8 && /^[A-Z0-9]+$/.test(clean);
}

/**
 * Formats duration in hours/minutes.
 */
export function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '0m';
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
