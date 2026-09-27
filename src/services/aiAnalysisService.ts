/**
 * MineGuard Mine Subsidence - Modular AI Anomaly Analysis Engine (Phase 1)
 *
 * PROTOTYPE AI ASSESSMENT LAYER
 * -------------------------------------------------------------
 * This service implements a modular statistical and multi-variable anomaly detection
 * engine on top of real telemetry provided by DataService.
 *
 * It is intentionally designed as an open architecture:
 *
 * EXTENSION POINT FOR FUTURE ML MODELS:
 * -------------------------------------------------------------
 * To replace this prototype statistical anomaly detector with a trained Machine Learning model
 * (e.g. Scikit-Learn Isolation Forest, PyTorch Autoencoder, LSTM Recurrent Network,
 * or Temporal Graph Neural Network for spatial-strata node graphs):
 *
 * 1. Implement the `AIModelProvider` interface defined below.
 * 2. Replace or delegate `AIAnalysisService.analyzeNode()` to the inference runtime
 *    (e.g., ONNX Runtime Web in-browser or backend microservice via FastAPI/MQTT).
 * 3. Keep the same `NodeAIAnalysis` and `NetworkAIAnalysis` return structures to maintain
 *    100% decoupling from the React dashboard UI.
 */

import { NodeData, NodeAIAnalysis, NetworkAIAnalysis, AIRiskLevel, AITrend } from '../types';

export interface TelemetrySnapshot {
  timestamp: number;
  tilt_deg: number;
  load_kg: number;
  gas_ppm_equiv: number;
  temperature: number;
  pressure: number;
  battery_percent: number;
  risk_score: number;
  warning_sensors: number;
  critical_sensors: number;
}

/**
 * Interface that any future ML model provider (Isolation Forest / LSTM / GNN) should adhere to.
 */
export interface AIModelProvider {
  name: string;
  version: string;
  analyzeNode(node: NodeData, history: TelemetrySnapshot[]): Promise<NodeAIAnalysis> | NodeAIAnalysis;
}

export class AIAnalysisService {
  private historyByNode: Map<string, TelemetrySnapshot[]> = new Map();
  private maxHistoryPerNode = 50;

  /**
   * Records a live node telemetry point into the rolling window history.
   * Called automatically as telemetry streams in from DataService.
   */
  public recordTelemetry(node: NodeData): void {
    const nodeId = node.node;
    if (!this.historyByNode.has(nodeId)) {
      this.historyByNode.set(nodeId, []);
    }
    const history = this.historyByNode.get(nodeId)!;

    const snapshot: TelemetrySnapshot = {
      timestamp: Date.now(),
      tilt_deg: node.tilt_deg,
      load_kg: node.load_kg,
      gas_ppm_equiv: node.gas_ppm_equiv,
      temperature: node.temperature,
      pressure: node.pressure,
      battery_percent: node.battery_percent,
      risk_score: node.risk_score,
      warning_sensors: node.warning_sensors,
      critical_sensors: node.critical_sensors,
    };

    history.push(snapshot);
    if (history.length > this.maxHistoryPerNode) {
      history.shift();
    }
  }

  /**
   * Analyze an individual node's telemetry against its recent rolling baseline.
   * Uses real telemetry only — does NOT fabricate or invent sensor readings.
   */
  public analyzeNode(node: NodeData): NodeAIAnalysis {
    try {
      this.recordTelemetry(node);
      const history = this.historyByNode.get(node.node) || [];

      // 1. Calculate Baselines (Mean, StdDev) from history
      const tiltStats = this.calcStats(history.map((h) => h.tilt_deg));
      const loadStats = this.calcStats(history.map((h) => h.load_kg));
      const gasStats = this.calcStats(history.map((h) => h.gas_ppm_equiv));

      // 2. Compute Z-Scores (Standardized Residuals against recent history)
      const tiltZ = tiltStats.std > 0.05 ? Math.abs((node.tilt_deg - tiltStats.mean) / tiltStats.std) : 0;
      const loadZ = loadStats.std > 0.1 ? Math.abs((node.load_kg - loadStats.mean) / loadStats.std) : 0;
      const gasZ = gasStats.std > 50 ? Math.abs((node.gas_ppm_equiv - gasStats.mean) / gasStats.std) : 0;

      // 3. Compute Rates of Change (Derivatives over last 3-5 samples)
      const tiltRate = this.calcRateOfChange(history.map((h) => h.tilt_deg));
      const loadRate = this.calcRateOfChange(history.map((h) => h.load_kg));
      const gasRate = this.calcRateOfChange(history.map((h) => h.gas_ppm_equiv));

      // 4. Barometric pressure deviation from baseline or standard
      const baselinePressure = node.pressureBaseline || 101325;
      const pressureDropPercent = ((baselinePressure - node.pressure) / baselinePressure) * 100;

      // 5. Multi-Sensor Anomaly Scoring (0.00 - 1.00)
      // Combines physical thresholds, statistical deviations, and multi-sensor correlations
      let anomalyScore = 0;
      const contributingFactors: string[] = [];

      // (a) Tilt Anomaly Contribution (weight: 0.30)
      const tiltNorm = Math.min(1.0, node.tilt_deg / 4.0);
      anomalyScore += tiltNorm * 0.30;
      if (node.tilt_deg >= 3.0) {
        contributingFactors.push(`Inclinometer tilt (${node.tilt_deg.toFixed(2)}°) exceeds 3.0° critical threshold`);
      } else if (node.tilt_deg >= 1.5) {
        contributingFactors.push(`Tilt reading (${node.tilt_deg.toFixed(2)}°) indicates moderate angular displacement`);
      }
      if (tiltZ > 2.0 && history.length >= 5) {
        contributingFactors.push(`Tilt z-score (${tiltZ.toFixed(1)}σ) is significantly above recent node baseline (${tiltStats.mean.toFixed(2)}°)`);
      }

      // (b) Structural Load Anomaly Contribution (weight: 0.25)
      const loadNorm = Math.min(1.0, node.load_kg / 7.0);
      anomalyScore += loadNorm * 0.25;
      if (node.load_kg >= 5.0) {
        contributingFactors.push(`Roof stress load cell (${node.load_kg.toFixed(2)} kg) exceeds 5.0 kg threshold`);
      } else if (node.load_kg >= 3.5) {
        contributingFactors.push(`Roof stress (${node.load_kg.toFixed(2)} kg) indicates elevated strata pressure`);
      }
      if (loadZ > 2.0 && history.length >= 5) {
        contributingFactors.push(`Load cell z-score (${loadZ.toFixed(1)}σ) elevated above rolling mean (${loadStats.mean.toFixed(2)} kg)`);
      }

      // (c) Multi-Sensor Correlation: Co-occurrence of Tilt + Load (Geotechnical coupling)
      if (node.tilt_deg >= 2.0 && node.load_kg >= 4.0) {
        anomalyScore += 0.15;
        contributingFactors.push(`Geotechnical coupling: Simultaneous roof load increase and angular tilt detected`);
      }

      // (d) Gas Indicator Contribution (weight: 0.20)
      const gasNorm = Math.min(1.0, node.gas_ppm_equiv / 10000);
      anomalyScore += gasNorm * 0.20;
      if (node.gas_ppm_equiv >= 7500) {
        contributingFactors.push(`Gas concentration (${node.gas_ppm_equiv.toFixed(0)} ppm-equiv) crossed warning limit`);
      } else if (gasZ > 2.0 && history.length >= 5) {
        contributingFactors.push(`Gas indicator z-score (${gasZ.toFixed(1)}σ) shows abnormal outgassing relative to baseline`);
      }

      // (e) Atmospheric / Thermal & Barometric Cavity Coupling
      if (pressureDropPercent >= 2.0) {
        anomalyScore += 0.08;
        contributingFactors.push(`Barometric pressure drop (${pressureDropPercent.toFixed(1)}%) consistent with underground micro-fracture opening`);
      }
      if (node.temperature >= 35) {
        anomalyScore += 0.05;
        contributingFactors.push(`Ambient temperature elevated (${node.temperature.toFixed(1)}°C)`);
      }

      // (f) Firmware Warning & Critical Sensors
      if (node.critical_sensors > 0) {
        anomalyScore += node.critical_sensors * 0.12;
        contributingFactors.push(`${node.critical_sensors} sensor channel(s) flagged CRITICAL by firmware thresholds`);
      }
      if (node.warning_sensors >= 3) {
        anomalyScore += 0.10;
        contributingFactors.push(`Multi-variable warning flags: ${node.warning_sensors} sensors concurrently in warning state`);
      }

      // (g) Battery Health Assessment
      if (node.battery_percent < 20) {
        contributingFactors.push(`Low battery reserve (${node.battery_percent}%) on remote station`);
      }

      // Clamp anomaly score
      const finalAnomalyScore = +Math.min(1.0, Math.max(0.02, anomalyScore)).toFixed(2);

      // Determine Anomaly Status
      const anomalyDetected =
        finalAnomalyScore >= 0.45 ||
        node.status === 'DANGER' ||
        node.critical_sensors > 0 ||
        (node.warning_sensors >= 2 && finalAnomalyScore >= 0.35);

      // Determine Risk Level
      let riskLevel: AIRiskLevel = 'LOW';
      if (finalAnomalyScore >= 0.70 || node.status === 'DANGER' || node.critical_sensors >= 2 || node.tilt_deg >= 3.5) {
        riskLevel = 'CRITICAL';
      } else if (finalAnomalyScore >= 0.48 || node.status === 'WARNING' || node.warning_sensors >= 2 || node.tilt_deg >= 2.0) {
        riskLevel = 'HIGH';
      } else if (finalAnomalyScore >= 0.28 || node.warning_sensors === 1) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      // Determine Trend
      let trend: AITrend = 'STABLE';
      const netDelta = (tiltRate > 0 ? 1 : tiltRate < 0 ? -1 : 0) + (loadRate > 0 ? 1 : loadRate < 0 ? -1 : 0) + (gasRate > 0 ? 1 : gasRate < 0 ? -1 : 0);
      if (netDelta >= 2 || tiltRate > 0.08 || loadRate > 0.15) {
        trend = 'INCREASING';
      } else if (netDelta <= -2 || (tiltRate < -0.08 && loadRate < -0.15)) {
        trend = 'DECREASING';
      }

      // Clear factors if nothing is flagged
      if (contributingFactors.length === 0) {
        contributingFactors.push('All parameters (tilt, load, gas, temp, pressure) within baseline operational envelope');
      }

      // Actionable AI recommendation based on real profile
      let recommendation = 'Maintain standard continuous multi-hop telemetry logging and routine inspections.';
      if (riskLevel === 'CRITICAL') {
        recommendation = `Priority geotechnical alert on ${node.node}: Immediate gallery evacuation around GPS (${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}). Deploy secondary extensometers.`;
      } else if (riskLevel === 'HIGH') {
        recommendation = `Prioritize inspection of ${node.node} and monitor telemetry closely. Check rock bolt tensioning and local ventilation.`;
      } else if (riskLevel === 'MEDIUM') {
        recommendation = `Observe trend on ${node.node}. Sensor fluctuations detected; ensure multi-hop LoRa packet reception is continuous.`;
      }

      return {
        node_id: node.node,
        status: node.status,
        risk_score: node.risk_score,
        anomaly_detected: anomalyDetected,
        anomaly_score: finalAnomalyScore,
        risk_level: riskLevel,
        contributing_factors: contributingFactors,
        trend,
        recommendation,
        generated_at: new Date().toLocaleTimeString(),
        metrics_analyzed: {
          tilt_deg: node.tilt_deg,
          load_kg: node.load_kg,
          gas_ppm_equiv: node.gas_ppm_equiv,
          temperature: node.temperature,
          pressure: node.pressure,
          battery_percent: node.battery_percent,
          warning_sensors: node.warning_sensors,
          critical_sensors: node.critical_sensors,
        },
      };
    } catch (err) {
      console.error(`AI analysis failed for node ${node.node}:`, err);
      return this.getFallbackNodeAnalysis(node);
    }
  }

  /**
   * Evaluates the entire sensor network across all nodes.
   */
  public analyzeNetwork(nodes: NodeData[]): NetworkAIAnalysis {
    try {
      if (!nodes || nodes.length === 0) {
        return this.getFallbackNetworkAnalysis();
      }

      const nodeAnalyses: Record<string, NodeAIAnalysis> = {};
      let highestScore = 0;
      let mostConcerningNodeId: string | null = null;
      let anomalousCount = 0;

      for (const node of nodes) {
        const analysis = this.analyzeNode(node);
        nodeAnalyses[node.node] = analysis;

        if (analysis.anomaly_detected) {
          anomalousCount++;
        }

        if (analysis.anomaly_score > highestScore) {
          highestScore = analysis.anomaly_score;
          mostConcerningNodeId = node.node;
        }
      }

      // Network risk level
      let overallRisk: AIRiskLevel = 'LOW';
      if (highestScore >= 0.70 || Object.values(nodeAnalyses).some((a) => a.risk_level === 'CRITICAL')) {
        overallRisk = 'CRITICAL';
      } else if (highestScore >= 0.48 || Object.values(nodeAnalyses).some((a) => a.risk_level === 'HIGH')) {
        overallRisk = 'HIGH';
      } else if (highestScore >= 0.28 || Object.values(nodeAnalyses).some((a) => a.risk_level === 'MEDIUM')) {
        overallRisk = 'MEDIUM';
      }

      let networkRecommendation = 'All underground mine nodes are operating within normal baseline tolerances.';
      if (overallRisk === 'CRITICAL' && mostConcerningNodeId) {
        networkRecommendation = `CRITICAL anomaly detected at ${mostConcerningNodeId}. Immediate gallery evacuation and geotechnical survey dispatch recommended.`;
      } else if (overallRisk === 'HIGH' && mostConcerningNodeId) {
        networkRecommendation = `High anomaly indication at ${mostConcerningNodeId}. Prioritize inspection and verify secondary rock bolt tension.`;
      } else if (overallRisk === 'MEDIUM' && mostConcerningNodeId) {
        networkRecommendation = `Moderate anomaly detected at ${mostConcerningNodeId}. Increase sampling cadence and track derivative trends.`;
      }

      return {
        overall_network_risk: overallRisk,
        most_concerning_node: mostConcerningNodeId,
        highest_anomaly_score: highestScore,
        anomalous_node_count: anomalousCount,
        node_analyses: nodeAnalyses,
        network_recommendation: networkRecommendation,
        generated_at: new Date().toLocaleTimeString(),
      };
    } catch (err) {
      console.error('AI network analysis failed:', err);
      return this.getFallbackNetworkAnalysis();
    }
  }

  // --- Statistical Helper Methods ---

  private calcStats(values: number[]): { mean: number; std: number } {
    if (!values || values.length === 0) return { mean: 0, std: 0 };
    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    return { mean, std: Math.sqrt(variance) };
  }

  private calcRateOfChange(values: number[]): number {
    if (!values || values.length < 3) return 0;
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    if (older.length === 0) return 0;
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
    return avgRecent - avgOlder;
  }

  private getFallbackNodeAnalysis(node: NodeData): NodeAIAnalysis {
    return {
      node_id: node.node,
      status: node.status,
      risk_score: node.risk_score,
      anomaly_detected: false,
      anomaly_score: 0.1,
      risk_level: 'LOW',
      contributing_factors: ['Telemetry baseline analysis temporarily in degraded mode.'],
      trend: 'STABLE',
      recommendation: 'Monitor raw telemetry while AI analysis re-establishes baseline.',
      generated_at: new Date().toLocaleTimeString(),
    };
  }

  private getFallbackNetworkAnalysis(): NetworkAIAnalysis {
    return {
      overall_network_risk: 'LOW',
      most_concerning_node: null,
      highest_anomaly_score: 0,
      anomalous_node_count: 0,
      node_analyses: {},
      network_recommendation: 'AI analysis temporarily unavailable.',
      generated_at: new Date().toLocaleTimeString(),
    };
  }
}

// Singleton export
export const aiAnalysisService = new AIAnalysisService();
