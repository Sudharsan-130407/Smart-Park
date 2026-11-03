import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDynamicRate,
  calculateParkingFee,
  findBestSpot,
  calculateFacilityStats,
  validateLicensePlate,
  formatDuration,
} from './parkingRules';
import { ParkingSpot } from '../types/parking';

test('calculateDynamicRate applies appropriate surge multipliers', () => {
  const baseRate = 10;
  // Low occupancy (<25%) gets 15% discount
  assert.equal(calculateDynamicRate(baseRate, 0.2, false), 8.5);

  // Moderate occupancy (50-74%) gets 15% surge
  assert.equal(calculateDynamicRate(baseRate, 0.6, false), 11.5);

  // High occupancy (>=75%) gets 40% surge
  assert.equal(calculateDynamicRate(baseRate, 0.8, false), 14.0);

  // Extreme occupancy (>=90%) gets 75% surge
  assert.equal(calculateDynamicRate(baseRate, 0.95, false), 17.5);

  // Peak hour adds 25% on top of surge
  assert.equal(calculateDynamicRate(baseRate, 0.6, true), 14.38);
});

test('calculateParkingFee computes standard and EV charging tariffs correctly', () => {
  const feeStandard = calculateParkingFee(2.5, 10, false);
  assert.equal(feeStandard.parkingFee, 25.0);
  assert.equal(feeStandard.evFee, 0);
  assert.equal(feeStandard.totalFee, 25.0);

  // EV charging with specific energy consumption (20 kWh at $0.35/kWh = $7.00)
  const feeEV = calculateParkingFee(3.0, 10, true, 20);
  assert.equal(feeEV.parkingFee, 30.0);
  assert.equal(feeEV.evFee, 7.0);
  assert.equal(feeEV.totalFee, 37.0);
});

test('findBestSpot recommends best available bay according to requirements', () => {
  const dummySpots: ParkingSpot[] = [
    {
      id: 's1',
      code: 'A-01',
      level: 1,
      type: 'standard',
      status: 'occupied',
      x: 0,
      y: 0,
      z: -10,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.0,
    },
    {
      id: 's2',
      code: 'A-02',
      level: 1,
      type: 'standard',
      status: 'available',
      x: 5,
      y: 0,
      z: -10,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.0,
    },
    {
      id: 's3',
      code: 'EV-01',
      level: 1,
      type: 'ev',
      status: 'available',
      x: 10,
      y: 0,
      z: -10,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.2,
    },
    {
      id: 's4',
      code: 'VIP-01',
      level: 2,
      type: 'vip',
      status: 'available',
      x: 0,
      y: 4,
      z: 0,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.5,
    },
  ];

  // Requesting standard vehicle
  const bestStandard = findBestSpot(dummySpots, {});
  assert.equal(bestStandard?.code, 'A-02');

  // Requesting EV spot
  const bestEV = findBestSpot(dummySpots, { requiresEV: true });
  assert.equal(bestEV?.code, 'EV-01');

  // Requesting VIP spot on Level 2
  const bestVIP = findBestSpot(dummySpots, { isVIP: true, preferredLevel: 2 });
  assert.equal(bestVIP?.code, 'VIP-01');
});

test('calculateFacilityStats aggregates counts accurately', () => {
  const dummySpots: ParkingSpot[] = [
    {
      id: '1',
      code: 'A-01',
      level: 1,
      type: 'standard',
      status: 'occupied',
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.0,
    },
    {
      id: '2',
      code: 'EV-01',
      level: 1,
      type: 'ev',
      status: 'occupied',
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      vehicle: { licensePlate: 'TESLA1', model: 'Model 3', color: '#ff0000', isEV: true },
      sensorHealth: 'optimal',
      rateMultiplier: 1.2,
    },
    {
      id: '3',
      code: 'A-02',
      level: 1,
      type: 'standard',
      status: 'available',
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.0,
    },
    {
      id: '4',
      code: 'B-01',
      level: 1,
      type: 'standard',
      status: 'reserved',
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      sensorHealth: 'optimal',
      rateMultiplier: 1.0,
    },
  ];

  const stats = calculateFacilityStats(dummySpots);
  assert.equal(stats.total, 4);
  assert.equal(stats.occupied, 2);
  assert.equal(stats.available, 1);
  assert.equal(stats.reserved, 1);
  assert.equal(stats.evInUse, 1);
  assert.equal(stats.occupancyRatio, 0.5);
});

test('validateLicensePlate filters invalid inputs', () => {
  assert.equal(validateLicensePlate('ABC-1234'), true);
  assert.equal(validateLicensePlate('7XYZ99'), true);
  assert.equal(validateLicensePlate('AB'), false); // too short
  assert.equal(validateLicensePlate('WAYTOOLONGLICENSE'), false); // too long
  assert.equal(validateLicensePlate('!!!***'), false); // invalid characters
});

test('formatDuration formats timestamps cleanly', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(45 * 60 * 1000), '45m');
  assert.equal(formatDuration((2 * 60 + 15) * 60 * 1000), '2h 15m');
});
