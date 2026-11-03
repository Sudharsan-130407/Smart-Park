import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI client with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * 1. LOW-LATENCY ASSISTANT: Uses gemini-3.1-flash-lite
 * For instantaneous driver inquiries, spot recommendation, quick plate status, and quick parking estimates.
 */
app.post('/api/gemini/fast-assistant', async (req: Request, res: Response) => {
  try {
    const { query, facilityContext } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const systemInstruction = `You are AeroPark Express, an ultra-fast real-time smart parking guidance assistant.
Respond concisely in 1-3 sentences with clear, actionable directions, spot recommendations, or status summaries.
Current Parking Context:
- Total spots: ${facilityContext?.totalSpots ?? 24}
- Available: ${facilityContext?.availableSpots ?? 8}
- Level 1 available: ${facilityContext?.level1Free ?? 4}
- Level 2 Rooftop available: ${facilityContext?.level2Free ?? 4}
- EV spots free: ${facilityContext?.evFree ?? 2}
- Current dynamic hourly rate: $${facilityContext?.currentRate ?? '10.00'}/hr
- Entrance barrier status: ${facilityContext?.gateOpen ? 'OPEN' : 'READY/SCANNING'}
Be friendly, direct, and mention exact bay codes (e.g. A-02, EV-01, B-03) where helpful.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: query,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      model: 'gemini-3.1-flash-lite',
      reply: response.text || 'Parking bay guidance updated.',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Fast assistant error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to process fast assistant query',
      model: 'gemini-3.1-flash-lite',
    });
  }
});

/**
 * 2. GENERAL PARKING INTELLIGENCE: Uses gemini-3.8-flash
 * For dynamic pricing analytics, occupancy prediction, and traffic flow suggestions.
 */
app.post('/api/gemini/analytics', async (req: Request, res: Response) => {
  try {
    const { metrics, historySample } = req.body;

    const systemInstruction = `You are a Smart Parking Revenue & Facility Intelligence Specialist.
Analyze the provided facility metrics and generate structured, insightful analytics:
1. Occupancy & Peak Demand Prediction (next 2-4 hours)
2. Dynamic Rate Recommendation (e.g., surge or discount recommendation)
3. EV Charger Utilization & Turnaround efficiency
4. Wayfinding Traffic Flow tip
Return clear, punchy bullet points and an executive summary.`;

    const prompt = `Current Facility State:
- Total Capacity: ${metrics?.totalSpots}
- Occupied: ${metrics?.occupiedSpots} (${Math.round((metrics?.occupancyRate || 0) * 100)}% occupancy)
- Available: ${metrics?.availableSpots}
- EV Chargers in use: ${metrics?.evChargingSpots}
- Base Rate: $${metrics?.baseHourlyRate}/hr
- Current Dynamic Rate: $${metrics?.currentDynamicRate}/hr
- Today's Revenue: $${metrics?.dailyRevenue}
- Recent events: ${JSON.stringify(historySample || [])}

Provide your smart assessment and recommended rate multiplier adjustment.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      model: 'gemini-3.8-flash',
      analysis: response.text,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate analytics',
      model: 'gemini-3.8-flash',
    });
  }
});

/**
 * 3. HIGH THINKING COMPLEX OPTIMIZER: Uses gemini-4-argon with thinkingLevel: HIGH
 * For solving deep multi-factor fleet dispatching, congestion mitigation, EV power grid load balancing, and gate incident resolution.
 * (No maxOutputTokens set, as required by instructions).
 */
app.post('/api/gemini/deep-optimize', async (req: Request, res: Response) => {
  try {
    const { scenario, facilityState } = req.body;

    const systemInstruction = `You are the Deep Autonomous Operations & Fleet Logistics AI for an advanced multi-tier Smart Parking Terminal.
Analyze high-complexity logistical challenges (such as sudden multi-vehicle surges, gate sensor bottlenecks, EV charging power cap limits, emergency vehicle corridors, and rooftop deck load distribution).
Provide:
1. Comprehensive Root Cause & Physical Bottleneck Diagnosis
2. Multi-Phase Action Plan (Immediate 0-5min, Short-term 5-30min, System Policy)
3. Dynamic Bay Re-allocation Matrix (which bays to reroute, prioritize, or reserve)
4. Safety & Energy Grid Safeguard Protocols`;

    const prompt = `OPTIMIZATION SCENARIO:
${scenario || 'Optimize incoming peak flow and balance Level 1 vs Level 2 rooftop EV charging demands while maintaining emergency clearways.'}

FACILITY STATE:
- Total bays: ${facilityState?.totalSpots ?? 24}
- Occupancy: ${facilityState?.occupancyPercentage ?? 70}%
- Level 1 Status: ${facilityState?.level1Occupied ?? 8}/${facilityState?.level1Total ?? 12} occupied
- Level 2 Rooftop: ${facilityState?.level2Occupied ?? 6}/${facilityState?.level2Total ?? 12} occupied
- EV Charging Grid Load: ${facilityState?.gridLoadKw ?? 48} kW / 80 kW capacity
- Entrance Queue: ${facilityState?.entranceQueue ?? 3} vehicles waiting
- Active Incident: ${facilityState?.activeIncident ?? 'None'}

Please use your full high-thinking reasoning to solve this multi-variable constraint optimization.`;

    let response;
    let usedModel = 'gemini-4-argon';

    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
    } catch (argonError: any) {
      console.warn('gemini-4-argon call failed, attempting fallback to gemini-3.8-flash:', argonError?.message);
      usedModel = 'gemini-3.8-flash';
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
    }

    return res.json({
      model: usedModel,
      resolutionPlan: response.text,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Deep optimize error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to perform deep optimization',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Parking System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
