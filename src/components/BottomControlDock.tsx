import React, { useState } from 'react';
import { ParkingSpot, FacilityMetrics, GateState } from '../types/parking';
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Sparkles,
  Search,
  Brain,
  Sliders,
  Send,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface BottomControlDockProps {
  spots: ParkingSpot[];
  metrics: FacilityMetrics;
  entranceGate: GateState;
  onToggleGate: () => void;
  onSelectSpot: (spot: ParkingSpot) => void;
  onRunLPRScan: (plate: string) => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  spots,
  metrics,
  entranceGate,
  onToggleGate,
  onSelectSpot,
  onRunLPRScan,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'finder' | 'analytics' | 'deepOptimize' | 'automation'>('finder');

  // Fast Assistant State (gemini-3.1-flash-lite)
  const [fastQuery, setFastQuery] = useState('');
  const [fastLoading, setFastLoading] = useState(false);
  const [fastReply, setFastReply] = useState<{ text: string; model: string; durationMs: number } | null>({
    text: 'AeroPark Express ready. Ask for optimal spot, plate lookup, or quick fare estimate.',
    model: 'gemini-3.1-flash-lite',
    durationMs: 0,
  });

  // Analytics State (gemini-3.8-flash)
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState<string | null>(null);

  // Deep Optimizer State (gemini-4-argon)
  const [selectedScenario, setSelectedScenario] = useState('surge');
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepResult, setDeepResult] = useState<{ plan: string; model: string } | null>(null);

  // Spot Filter
  const [spotFilter, setSpotFilter] = useState<'all' | 'level1' | 'level2' | 'ev' | 'available'>('available');
  const [scanPlateInput, setScanPlateInput] = useState('TESLA-99');

  // Handlers for AI calls
  const handleFastAssistantSubmit = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || fastQuery;
    if (!query.trim()) return;

    setFastLoading(true);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/gemini/fast-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          facilityContext: {
            totalSpots: metrics.totalSpots,
            availableSpots: metrics.availableSpots,
            level1Free: spots.filter((s) => s.level === 1 && s.status === 'available').length,
            level2Free: spots.filter((s) => s.level === 2 && s.status === 'available').length,
            evFree: spots.filter((s) => s.type === 'ev' && s.status === 'available').length,
            currentRate: metrics.currentDynamicRate,
            gateOpen: entranceGate.isOpen,
          },
        }),
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);

      setFastReply({
        text: data.reply || data.error || 'Response received.',
        model: data.model || 'gemini-3.1-flash-lite',
        durationMs: elapsed,
      });
    } catch (err: any) {
      setFastReply({
        text: `Error connecting to fast assistant: ${err.message}`,
        model: 'gemini-3.1-flash-lite',
        durationMs: 0,
      });
    } finally {
      setFastLoading(false);
    }
  };

  const handleGenerateAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/gemini/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          historySample: [
            { time: '10:00', occupancy: '45%' },
            { time: '11:00', occupancy: '62%' },
            { time: '12:00', occupancy: '75%' },
          ],
        }),
      });
      const data = await res.json();
      setAnalyticsResult(data.analysis || data.error || 'Analytics generated.');
    } catch (err: any) {
      setAnalyticsResult(`Failed to generate analytics: ${err.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRunDeepOptimization = async () => {
    setDeepLoading(true);
    try {
      let scenarioText = 'Multi-vehicle peak surge: 5 EVs + 4 VIPs arriving simultaneously with limited Level 1 capacity.';
      if (selectedScenario === 'grid') {
        scenarioText = 'EV fast charging power threshold alert: 6 vehicles requesting 50kW charge simultaneously. Balance rooftop solar output with grid constraints.';
      } else if (selectedScenario === 'incident') {
        scenarioText = 'Entrance barrier blockage in Lane 1 with line of 4 vehicles queued. Re-route traffic to secondary emergency gate and update driver guidance matrix.';
      }

      const res = await fetch('/api/gemini/deep-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenarioText,
          facilityState: {
            totalSpots: metrics.totalSpots,
            occupancyPercentage: Math.round(metrics.occupancyRate * 100),
            level1Occupied: spots.filter((s) => s.level === 1 && s.status === 'occupied').length,
            level1Total: 12,
            level2Occupied: spots.filter((s) => s.level === 2 && s.status === 'occupied').length,
            level2Total: 12,
            gridLoadKw: 56,
            entranceQueue: 3,
            activeIncident: selectedScenario === 'incident' ? 'Lane 1 Barrier Sensor Fault' : 'None',
          },
        }),
      });
      const data = await res.json();
      setDeepResult({
        plan: data.resolutionPlan || data.error || 'Plan generated.',
        model: data.model || 'gemini-4-argon',
      });
    } catch (err: any) {
      setDeepResult({
        plan: `Error running deep optimizer: ${err.message}`,
        model: 'gemini-4-argon',
      });
    } finally {
      setDeepLoading(false);
    }
  };

  // Filtered spots for quick list
  const filteredSpots = spots.filter((s) => {
    if (spotFilter === 'available') return s.status === 'available';
    if (spotFilter === 'level1') return s.level === 1;
    if (spotFilter === 'level2') return s.level === 2;
    if (spotFilter === 'ev') return s.type === 'ev';
    return true;
  });

  return (
    <aside
      aria-label="Smart Parking Control Dock"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] pointer-events-auto transition-transform duration-300 ease-out"
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-t-xl bg-slate-900 border-t border-x border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
          aria-expanded={!isCollapsed}
          aria-controls="bottom-control-dock-content"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-4 h-4 text-cyan-400" />
              <span>Expand Control Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-slate-400" />
              <span>Collapse Dock</span>
            </>
          )}
        </button>
      </div>

      {/* Main Solid Dock Surface (No backdrop-filter over WebGL to prevent stalls) */}
      {!isCollapsed && (
        <div
          id="bottom-control-dock-content"
          className="bg-slate-900/98 border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-100 max-h-[380px] overflow-y-auto"
        >
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('finder')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'finder'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-300" />
                Fast Assistant
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  3.1 Lite
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-300" />
                Dynamic Pricing
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  3.8 Flash
                </span>
              </button>

              <button
                onClick={() => setActiveTab('deepOptimize')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'deepOptimize'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-purple-300" />
                High-Thinking Optimizer
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  4-Argon
                </span>
              </button>

              <button
                onClick={() => setActiveTab('automation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'automation'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Gate & LPR Scanner
              </button>
            </div>

            {/* Quick stats mini-tag */}
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Click any 3D parking bay to inspect or manage
            </div>
          </div>

          {/* TAB 1: FAST ASSISTANT (gemini-3.1-flash-lite) */}
          {activeTab === 'finder' && (
            <div className="space-y-3">
              {/* Natural Language Query Bar */}
              <form onSubmit={handleFastAssistantSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={fastQuery}
                    onChange={(e) => setFastQuery(e.target.value)}
                    placeholder="Ask low-latency assistant: 'Find closest EV spot', 'Where is CAL-4902?', 'Estimate 2 hours'..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={fastLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 shadow"
                >
                  {fastLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Ask Lite
                </button>
              </form>

              {/* Sample Quick Questions */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-300">
                <span className="text-slate-500 font-medium">Quick Prompts:</span>
                {[
                  'Find fastest available EV spot',
                  'Find standard bay on Level 1',
                  'Estimate fee for 3 hours',
                  'What is current gate status?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setFastQuery(prompt);
                      handleFastAssistantSubmit(undefined, prompt);
                    }}
                    className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* AI Response Card */}
              {fastReply && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1">
                        AeroPark Express Guidance
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {fastReply.model} {fastReply.durationMs > 0 && `• ${fastReply.durationMs}ms`}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{fastReply.text}</p>
                  </div>
                </div>
              )}

              {/* Spot Quick Filter Pills & Micro Stalls List */}
              <div className="pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex gap-1 text-[11px]">
                    {(['available', 'all', 'level1', 'level2', 'ev'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSpotFilter(mode)}
                        className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${
                          spotFilter === mode
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">{filteredSpots.length} bays shown</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                  {filteredSpots.slice(0, 16).map((spot) => (
                    <button
                      key={spot.id}
                      onClick={() => onSelectSpot(spot)}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        spot.status === 'available'
                          ? 'bg-emerald-950/40 border-emerald-800/60 hover:border-emerald-500 text-emerald-200'
                          : spot.status === 'occupied'
                          ? 'bg-rose-950/30 border-rose-900/60 hover:border-rose-500 text-rose-300'
                          : 'bg-blue-950/30 border-blue-900/60 hover:border-blue-500 text-blue-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{spot.code}</div>
                      <div className="text-[10px] opacity-75 capitalize">{spot.status}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS & DYNAMIC PRICING (gemini-3.8-flash) */}
          {activeTab === 'analytics' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Predictive Occupancy & Dynamic Surge Pricing
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time demand modeling and revenue optimization powered by gemini-3.8-flash.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAnalytics}
                  disabled={analyticsLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 shadow"
                >
                  {analyticsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate AI Analysis
                </button>
              </div>

              {/* Real-time stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Occupancy Rate</div>
                  <div className="text-lg font-bold text-indigo-300">
                    {Math.round(metrics.occupancyRate * 100)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Dynamic Rate</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ${metrics.currentDynamicRate.toFixed(2)}/hr
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">EV Bay Utilization</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {spots.filter((s) => s.type === 'ev' && s.status === 'occupied').length} /{' '}
                    {spots.filter((s) => s.type === 'ev').length} in use
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Estimated Daily Run</div>
                  <div className="text-lg font-bold text-amber-300">
                    ${(metrics.currentDynamicRate * metrics.occupiedSpots * 8).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Analysis Result */}
              {analyticsResult && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-indigo-900/60 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                  {analyticsResult}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HIGH-THINKING DEEP OPTIMIZER (gemini-4-argon with thinkingLevel: HIGH) */}
          {activeTab === 'deepOptimize' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Deep Fleet & Complex Incident Optimizer
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Multi-variable constraint solver using gemini-4-argon with high thinking mode.
                  </p>
                </div>
                <button
                  onClick={handleRunDeepOptimization}
                  disabled={deepLoading}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 shadow"
                >
                  {deepLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Run High-Thinking Solver
                </button>
              </div>

              {/* Scenario Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'surge', label: 'Multi-Vehicle Peak Surge', desc: 'Simultaneous EV & VIP arrivals' },
                  { id: 'grid', label: 'EV Grid Power Cap Exceeded', desc: 'Solar output vs 50kW fast charge load' },
                  { id: 'incident', label: 'Entrance Barrier Jammed', desc: 'Lane 1 queue clearance & wayfinding reroute' },
                ].map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => setSelectedScenario(scen.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      selectedScenario === scen.id
                        ? 'bg-purple-950/60 border-purple-500 text-white'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs">{scen.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{scen.desc}</div>
                  </button>
                ))}
              </div>

              {/* Thinking Output Container */}
              {deepResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-purple-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5" />
                      Deep Reasoning & Actionable Execution Plan
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Engine: {deepResult.model} (ThinkingLevel.HIGH)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-purple-900/60 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto font-sans">
                    {deepResult.plan}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUTOMATION & LPR GATE CONTROL */}
          {activeTab === 'automation' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gate Barrier Controls */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">Entrance Barrier Gate</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        entranceGate.isOpen ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {entranceGate.isOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatic RFID & Optical sensor triggers. Manual override allows security control.
                  </p>
                  <button
                    onClick={onToggleGate}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors shadow ${
                      entranceGate.isOpen
                        ? 'bg-rose-700 hover:bg-rose-600 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {entranceGate.isOpen ? 'Close Barrier Gate' : 'Open Barrier Gate'}
                  </button>
                </div>

                {/* LPR Scanner Simulator */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">LPR Overhead Camera Gantry</span>
                    <span className="text-[10px] font-mono text-cyan-400">99.4% OCR ACCURACY</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scanPlateInput}
                      onChange={(e) => setScanPlateInput(e.target.value)}
                      placeholder="License Plate"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-white uppercase"
                    />
                    <button
                      onClick={() => onRunLPRScan(scanPlateInput)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1 shadow"
                    >
                      Scan & Guide
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Last scanned plate: <span className="font-mono text-amber-300 font-semibold">{entranceGate.lprCamera.lastScannedPlate || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
