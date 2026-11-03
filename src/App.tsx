import React, { useState, useMemo, useCallback } from 'react';
import { ParkingScene } from './components/ParkingScene';
import { TopBar } from './components/TopBar';
import { BottomControlDock } from './components/BottomControlDock';
import { SpotInspectorModal } from './components/SpotInspectorModal';
import { INITIAL_PARKING_SPOTS } from './utils/initialParkingData';
import { ParkingSpot, GateState, FacilityMetrics } from './types/parking';
import {
  calculateDynamicRate,
  calculateFacilityStats,
  findBestSpot,
} from './utils/parkingRules';

export default function App() {
  const [spots, setSpots] = useState<ParkingSpot[]>(INITIAL_PARKING_SPOTS);
  const [selectedSpotId, setSelectedSpotId] = useState<string | undefined>(undefined);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'entrance' | 'evBay' | 'rooftop' | 'driver'>('overview');
  const [nightMode, setNightMode] = useState(false);
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);

  const [entranceGate, setEntranceGate] = useState<GateState>({
    id: 'entrance',
    name: 'Main North Gate',
    isOpen: false,
    barrierAngle: 0,
    lprCamera: {
      confidence: 0.99,
      isScanning: false,
      lastScannedPlate: 'EV-TESLA9',
    },
    trafficLight: 'red',
  });

  // Calculate live metrics
  const stats = useMemo(() => calculateFacilityStats(spots), [spots]);
  const baseHourlyRate = 10.0;
  const currentDynamicRate = useMemo(
    () => calculateDynamicRate(baseHourlyRate, stats.occupancyRatio, false),
    [stats.occupancyRatio]
  );

  const metrics: FacilityMetrics = useMemo(
    () => ({
      totalSpots: stats.total,
      occupiedSpots: stats.occupied,
      availableSpots: stats.available,
      reservedSpots: stats.reserved,
      evChargingSpots: stats.evInUse,
      occupancyRate: stats.occupancyRatio,
      baseHourlyRate,
      currentDynamicRate,
      dailyRevenue: 1420 + stats.occupied * currentDynamicRate * 2.5,
      activeIncidents: 0,
    }),
    [stats, currentDynamicRate]
  );

  const selectedSpot = useMemo(
    () => spots.find((s) => s.id === selectedSpotId),
    [spots, selectedSpotId]
  );

  const showToast = useCallback((title: string, message: string) => {
    setNotification({ title, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.title === title ? null : curr));
    }, 4500);
  }, []);

  // Spot selection
  const handleSelectSpot = useCallback((spot: ParkingSpot) => {
    setSelectedSpotId(spot.id);
  }, []);

  // Park vehicle
  const handleParkVehicle = useCallback(
    (spotId: string, vehicleData: { licensePlate: string; model: string; color: string; isEV: boolean }) => {
      setSpots((prev) =>
        prev.map((s) => {
          if (s.id !== spotId) return s;
          return {
            ...s,
            status: 'occupied',
            occupiedSince: Date.now(),
            vehicle: {
              licensePlate: vehicleData.licensePlate,
              model: vehicleData.model,
              color: vehicleData.color,
              isEV: vehicleData.isEV,
              batteryLevel: vehicleData.isEV ? 65 : undefined,
              targetCharge: vehicleData.isEV ? 90 : undefined,
              chargeRateKw: vehicleData.isEV && s.type === 'ev' ? 22 : undefined,
            },
          };
        })
      );
      showToast('Vehicle Parked', `${vehicleData.model} (${vehicleData.licensePlate}) checked into bay.`);
    },
    [showToast]
  );

  // Release spot
  const handleReleaseSpot = useCallback(
    (spotId: string) => {
      const target = spots.find((s) => s.id === spotId);
      const plate = target?.vehicle?.licensePlate || 'Vehicle';
      setSpots((prev) =>
        prev.map((s) => {
          if (s.id !== spotId) return s;
          return {
            ...s,
            status: 'available',
            occupiedSince: undefined,
            vehicle: undefined,
            reservedUntil: undefined,
          };
        })
      );
      showToast('Spot Cleared', `${plate} departed from stall ${target?.code}.`);
    },
    [spots, showToast]
  );

  // Reserve spot
  const handleReserveSpot = useCallback(
    (spotId: string) => {
      setSpots((prev) =>
        prev.map((s) => {
          if (s.id !== spotId) return s;
          return {
            ...s,
            status: 'reserved',
            reservedUntil: Date.now() + 1800000,
          };
        })
      );
      showToast('Reservation Active', `Stall held for 30 minutes.`);
    },
    [showToast]
  );

  // Toggle EV charging
  const handleToggleEVCharging = useCallback(
    (spotId: string) => {
      setSpots((prev) =>
        prev.map((s) => {
          if (s.id !== spotId || !s.vehicle) return s;
          const isCurrentlyCharging = (s.vehicle.chargeRateKw || 0) > 0;
          return {
            ...s,
            vehicle: {
              ...s.vehicle,
              chargeRateKw: isCurrentlyCharging ? 0 : 22.0,
            },
          };
        })
      );
      showToast('EV Charging Updated', 'Charger state changed.');
    },
    [showToast]
  );

  // Manual Gate Toggle
  const handleToggleGate = useCallback(() => {
    setEntranceGate((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
      trafficLight: !prev.isOpen ? 'green' : 'red',
    }));
  }, []);

  // LPR Scan & Autonomous Wayfinding
  const handleRunLPRScan = useCallback(
    (plate: string) => {
      const isEV = plate.toUpperCase().includes('EV') || plate.toUpperCase().includes('TESLA');
      const best = findBestSpot(spots, { requiresEV: isEV });

      setEntranceGate((prev) => ({
        ...prev,
        isOpen: true,
        trafficLight: 'green',
        lprCamera: {
          ...prev.lprCamera,
          lastScannedPlate: plate.toUpperCase(),
          scanTimestamp: Date.now(),
        },
      }));

      if (best) {
        setSelectedSpotId(best.id);
        showToast(
          'LPR Verified & Barrier Lifted',
          `Scanned plate ${plate.toUpperCase()} • Directing to optimal bay ${best.code} on Level ${best.level}`
        );
      } else {
        showToast('Facility Full', `Plate ${plate.toUpperCase()} scanned, but all preferred stalls are occupied.`);
      }

      // Auto-close gate after 4 seconds
      setTimeout(() => {
        setEntranceGate((prev) => ({
          ...prev,
          isOpen: false,
          trafficLight: 'red',
        }));
      }, 4000);
    },
    [spots, showToast]
  );

  // Simulate Random Vehicle Arrival
  const handleSimulateArrival = useCallback(() => {
    const available = spots.filter((s) => s.status === 'available');
    if (available.length === 0) {
      showToast('Facility At Capacity', 'No stalls currently available for new arrivals.');
      return;
    }
    const target = available[Math.floor(Math.random() * available.length)];
    const plates = ['CA-4491', 'TX-8021', 'WA-9192', 'FL-3301', 'OR-7714', 'NY-6549'];
    const models = ['Lucid Air Pure', 'Rivian R1T', 'Tesla Model 3', 'Kia EV6', 'Audi Q4 e-tron'];
    const colors = ['#0284c7', '#dc2626', '#10b981', '#f59e0b', '#6366f1', '#18181b'];

    const chosenPlate = plates[Math.floor(Math.random() * plates.length)];
    const chosenModel = models[Math.floor(Math.random() * models.length)];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    // Trigger gate opening
    setEntranceGate((prev) => ({
      ...prev,
      isOpen: true,
      trafficLight: 'green',
      lprCamera: {
        ...prev.lprCamera,
        lastScannedPlate: chosenPlate,
      },
    }));

    setTimeout(() => {
      handleParkVehicle(target.id, {
        licensePlate: chosenPlate,
        model: chosenModel,
        color: chosenColor,
        isEV: target.type === 'ev' || Math.random() > 0.5,
      });
      setSelectedSpotId(target.id);
    }, 1200);

    setTimeout(() => {
      setEntranceGate((prev) => ({
        ...prev,
        isOpen: false,
        trafficLight: 'red',
      }));
    }, 4500);
  }, [spots, handleParkVehicle, showToast]);

  return (
    <main
      data-testid="smart-parking-main"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* 3D WebGL Digital Twin Viewport */}
      <ParkingScene
        spots={spots}
        entranceGate={entranceGate}
        selectedSpotId={selectedSpotId}
        onSelectSpot={handleSelectSpot}
        cameraPreset={cameraPreset}
        nightMode={nightMode}
      />

      {/* Top HUD: Metrics & Camera Presets */}
      <TopBar
        metrics={metrics}
        cameraPreset={cameraPreset}
        onSelectCamera={setCameraPreset}
        nightMode={nightMode}
        onToggleNightMode={() => setNightMode((prev) => !prev)}
        onSimulateArrival={handleSimulateArrival}
      />

      {/* Spot Inspector Drawer (when a bay is selected) */}
      {selectedSpot && (
        <SpotInspectorModal
          spot={selectedSpot}
          currentDynamicRate={metrics.currentDynamicRate}
          onClose={() => setSelectedSpotId(undefined)}
          onParkVehicle={handleParkVehicle}
          onReleaseSpot={handleReleaseSpot}
          onReserveSpot={handleReserveSpot}
          onToggleEVCharging={handleToggleEVCharging}
        />
      )}

      {/* Collapsible Ergonomic Bottom Dock (AI Assistants, Analytics, Gates) */}
      <BottomControlDock
        spots={spots}
        metrics={metrics}
        entranceGate={entranceGate}
        onToggleGate={handleToggleGate}
        onSelectSpot={handleSelectSpot}
        onRunLPRScan={handleRunLPRScan}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-18 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-800 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <div className="text-xs">
            <span className="font-bold text-cyan-300 mr-1">{notification.title}:</span>
            <span className="text-slate-200">{notification.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}
