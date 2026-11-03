import React, { useState } from 'react';
import { ParkingSpot } from '../types/parking';
import { calculateParkingFee, formatDuration } from '../utils/parkingRules';
import { X, Car, Zap, Shield, Clock, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface SpotInspectorModalProps {
  spot: ParkingSpot;
  currentDynamicRate: number;
  onClose: () => void;
  onParkVehicle: (spotId: string, vehicleData: { licensePlate: string; model: string; color: string; isEV: boolean }) => void;
  onReleaseSpot: (spotId: string) => void;
  onReserveSpot: (spotId: string) => void;
  onToggleEVCharging: (spotId: string) => void;
}

export const SpotInspectorModal: React.FC<SpotInspectorModalProps> = ({
  spot,
  currentDynamicRate,
  onClose,
  onParkVehicle,
  onReleaseSpot,
  onReserveSpot,
  onToggleEVCharging,
}) => {
  const [newPlate, setNewPlate] = useState('CAL-9102');
  const [newModel, setNewModel] = useState('Polestar 2 EV');
  const [newColor, setNewColor] = useState('#0284c7');
  const [isEV, setIsEV] = useState(spot.type === 'ev');

  const durationMs = spot.occupiedSince ? Date.now() - spot.occupiedSince : 0;
  const durationHours = durationMs / 3600000;
  const feeDetails = calculateParkingFee(
    durationHours,
    currentDynamicRate,
    !!spot.vehicle?.isEV && !!spot.vehicle?.chargeRateKw,
    spot.vehicle?.isEV ? durationHours * 15 : 0,
    spot.rateMultiplier
  );

  const handleParkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;
    onParkVehicle(spot.id, {
      licensePlate: newPlate.trim().toUpperCase(),
      model: newModel.trim(),
      color: newColor,
      isEV,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spot-dialog-title"
      className="absolute top-16 right-4 z-30 w-88 max-w-[calc(100vw-32px)] max-h-[calc(100vh-140px)] overflow-y-auto bg-slate-900/98 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 font-bold text-cyan-400 text-sm">
            {spot.code}
          </div>
          <div>
            <h2 id="spot-dialog-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Bay {spot.code}
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Level {spot.level} {spot.level === 2 ? '(Rooftop)' : '(Ground)'}
              </span>
            </h2>
            <div className="text-xs text-slate-400 capitalize">
              {spot.type} Stall • Multiplier: {spot.rateMultiplier}x
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-4 text-xs font-medium">
        <span className="text-slate-400">Bay Status</span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              spot.status === 'available'
                ? 'bg-emerald-400'
                : spot.status === 'occupied'
                ? 'bg-rose-500'
                : 'bg-blue-400'
            }`}
          />
          <span className="capitalize font-semibold text-slate-200">{spot.status}</span>
        </div>
      </div>

      {/* OCCUPIED STATE DETAILS */}
      {spot.status === 'occupied' && spot.vehicle && (
        <div className="space-y-3.5 mb-5">
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">License Plate</span>
              <span className="font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300">
                {spot.vehicle.licensePlate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vehicle Model</span>
              <span className="font-medium text-slate-200">{spot.vehicle.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Parked Time
              </span>
              <span className="font-medium text-slate-200">{formatDuration(durationMs)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Accrued Fee
              </span>
              <span className="font-bold text-emerald-400 text-sm">
                ${feeDetails.totalFee.toFixed(2)}
              </span>
            </div>
          </div>

          {/* EV Charging Status if vehicle is EV */}
          {spot.vehicle.isEV && (
            <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  EV Fast Charging
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {spot.vehicle.chargeRateKw ? `${spot.vehicle.chargeRateKw} kW` : 'Idle'}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${spot.vehicle.batteryLevel || 75}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Battery: {spot.vehicle.batteryLevel || 75}%</span>
                <span>Target: {spot.vehicle.targetCharge || 90}%</span>
              </div>
              <button
                onClick={() => onToggleEVCharging(spot.id)}
                className="w-full mt-1 py-1.5 text-xs font-semibold rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white transition-colors"
              >
                {spot.vehicle.chargeRateKw ? 'Pause Charging' : 'Start Fast Charging'}
              </button>
            </div>
          )}

          <button
            onClick={() => onReleaseSpot(spot.id)}
            className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-rose-700 hover:bg-rose-600 text-white transition-colors shadow flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Check Out & Release Bay
          </button>
        </div>
      )}

      {/* AVAILABLE STATE: PARK FORM */}
      {spot.status === 'available' && (
        <form onSubmit={handleParkSubmit} className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Vehicle License Plate
            </label>
            <input
              type="text"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="e.g. ABC-1234"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Vehicle Model
            </label>
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="e.g. Tesla Model 3"
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Vehicle Color
              </label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={isEV}
                  onChange={(e) => setIsEV(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                Electric Vehicle (EV)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow flex items-center justify-center gap-1.5"
          >
            <Car className="w-4 h-4" />
            Park Vehicle in Bay {spot.code}
          </button>

          <button
            type="button"
            onClick={() => onReserveSpot(spot.id)}
            className="w-full py-1.5 px-3 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            Reserve for Incoming Driver
          </button>
        </form>
      )}

      {/* RESERVED STATE */}
      {spot.status === 'reserved' && (
        <div className="space-y-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-blue-400">
              <Shield className="w-4 h-4" />
              Reserved Stall
            </div>
            <p className="text-[11px] text-slate-300">
              This bay is held for an incoming reservation. Automated barrier will lift on plate verification.
            </p>
          </div>
          <button
            onClick={() => onReleaseSpot(spot.id)}
            className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            Cancel Reservation (Make Free)
          </button>
        </div>
      )}
    </div>
  );
};
