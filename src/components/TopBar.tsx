import React from 'react';
import { FacilityMetrics } from '../types/parking';
import { Car, Zap, Moon, Sun, Camera, Sparkles, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  metrics: FacilityMetrics;
  cameraPreset: 'overview' | 'entrance' | 'evBay' | 'rooftop' | 'driver';
  onSelectCamera: (preset: 'overview' | 'entrance' | 'evBay' | 'rooftop' | 'driver') => void;
  nightMode: boolean;
  onToggleNightMode: () => void;
  onSimulateArrival: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  metrics,
  cameraPreset,
  onSelectCamera,
  nightMode,
  onToggleNightMode,
  onSimulateArrival,
}) => {
  const occPct = Math.round(metrics.occupancyRate * 100);

  return (
    <header className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* Brand & Live Facility Metrics */}
      <div className="flex items-center gap-2.5 bg-slate-900/95 border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-xl text-white pointer-events-auto">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-600 text-white font-bold text-sm shadow">
          <Car className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold tracking-tight text-slate-100">AeroPark 3D</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Digital Twin
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>{metrics.availableSpots} Free</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>{metrics.occupiedSpots}/{metrics.totalSpots} Occupied ({occPct}%)</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-semibold">${metrics.currentDynamicRate.toFixed(2)}/hr</span>
          </div>
        </div>
      </div>

      {/* Camera Presets & Fast Actions */}
      <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1.5 shadow-xl text-white pointer-events-auto">
        <div className="flex items-center gap-1 pr-1 border-r border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            Views:
          </span>
          {(
            [
              { id: 'overview', label: 'Drone' },
              { id: 'entrance', label: 'Gate' },
              { id: 'evBay', label: '⚡ EV' },
              { id: 'rooftop', label: 'Rooftop' },
              { id: 'driver', label: 'Driver' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectCamera(preset.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                cameraPreset === preset.id
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={onSimulateArrival}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors shadow"
          title="Simulate random vehicle entry"
        >
          <Car className="w-3.5 h-3.5" />
          + Vehicle Entry
        </button>

        <button
          onClick={onToggleNightMode}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title={nightMode ? 'Switch to Day Light' : 'Switch to Night Illumination'}
          aria-label="Toggle Night Mode"
        >
          {nightMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-300" />}
        </button>
      </div>
    </header>
  );
};
