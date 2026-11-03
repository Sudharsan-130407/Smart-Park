export type SpotType = 'standard' | 'ev' | 'accessible' | 'vip' | 'compact';

export type SpotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface ParkingSpot {
  id: string;
  code: string; // e.g. "A-01", "B-04"
  level: number; // 1 or 2
  type: SpotType;
  status: SpotStatus;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  occupiedSince?: number; // timestamp ms
  reservedUntil?: number; // timestamp ms
  vehicle?: {
    licensePlate: string;
    model: string;
    color: string;
    ownerName?: string;
    isEV?: boolean;
    batteryLevel?: number; // 0 - 100%
    targetCharge?: number; // 0 - 100%
    chargeRateKw?: number;
  };
  sensorHealth: 'optimal' | 'warning' | 'fault';
  rateMultiplier: number;
}

export interface GateState {
  id: 'entrance' | 'exit';
  name: string;
  isOpen: boolean;
  barrierAngle: number; // 0 (closed) to Math.PI / 2 (open)
  lprCamera: {
    lastScannedPlate?: string;
    confidence: number;
    scanTimestamp?: number;
    isScanning: boolean;
  };
  trafficLight: 'red' | 'green';
}

export interface FacilityMetrics {
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  reservedSpots: number;
  evChargingSpots: number;
  occupancyRate: number; // 0 - 1
  baseHourlyRate: number;
  currentDynamicRate: number;
  dailyRevenue: number;
  activeIncidents: number;
}
