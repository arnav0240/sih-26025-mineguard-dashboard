import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CriticalAlertHero } from './components/CriticalAlertHero';
import { KpiMetrics } from './components/KpiMetrics';
import { MineMap } from './components/MineMap';
import { TunnelSchematic } from './components/TunnelSchematic';
import { LoRaTopology } from './components/LoRaTopology';
import { NodeGrid } from './components/NodeGrid';
import { NodeTable } from './components/NodeTable';
import { TelemetryCharts } from './components/TelemetryCharts';
import { SimulationLab } from './components/SimulationLab';
import { LoRaTerminal } from './components/LoRaTerminal';
import { AiAdvisorPanel } from './components/AiAdvisorPanel';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { GatewayModal } from './components/GatewayModal';
import { IncidentTimeline } from './components/IncidentTimeline';

import {
  Map,
  Layers,
  LayoutGrid,
  Table,
  Activity,
  TrendingUp,
  Sliders,
  Columns,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { dataService } from './services/dataService';
import { generateAIAnalysis } from './services/aiAdvisor';
import { NodeData, AlarmState, LoRaPacketLog, DemoScenario, ConnectionStatus, AlertHistoryItem } from './types';

type ActiveTab = 'GEOSPATIAL_SUBSURFACE' | 'CHARTS' | 'SIMULATOR';
type GeoViewMode = 'DUAL' | 'MAP_ONLY' | 'STRATA_ONLY';

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>(dataService.getNodes());
  const [alarm, setAlarm] = useState<AlarmState>(dataService.recomputeAll());
  const [packets, setPackets] = useState<LoRaPacketLog[]>([]);

  // Interlinked Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string>('NODE-3'); // Default to critical node
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lon: number } | null>({
    lat: 19.054900,
    lon: 73.069300,
  });

  const [mode, setMode] = useState<'SIMULATION' | 'LIVE_GATEWAY'>(dataService.getMode());
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>('DEFAULT_DEMO');
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [gatewayUrl, setGatewayUrl] = useState<string>(dataService.getGatewayUrl());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dataService.getConnectionStatus());
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(dataService.getLastHeartbeat());
  const [connectionError, setConnectionError] = useState<string | null>(dataService.getConnectionError());
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>(dataService.getAlertHistory());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Enterprise UI Views
  const [activeTab, setActiveTab] = useState<ActiveTab>('GEOSPATIAL_SUBSURFACE');
  const [geoViewMode, setGeoViewMode] = useState<GeoViewMode>('DUAL');
  const [stationListMode, setStationListMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  useEffect(() => {
    // Start data service polling/simulation engine at 1s interval
    dataService.start(1000);

    const unsubscribeNodes = dataService.subscribe((updatedNodes, currentAlarm) => {
      setNodes(updatedNodes);
      setAlarm(currentAlarm);
    });

    const unsubscribePackets = dataService.subscribePackets((newPacket) => {
      setPackets((prev) => [...prev.slice(-49), newPacket]);
    });

    const unsubscribeConnection = dataService.subscribeConnectionStatus((status, hb, err) => {
      setConnectionStatus(status);
      setLastHeartbeat(hb);
      setConnectionError(err);
    });

    const unsubscribeAlerts = dataService.subscribeAlertHistory((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    return () => {
      unsubscribeNodes();
      unsubscribePackets();
      unsubscribeConnection();
      unsubscribeAlerts();
      dataService.stop();
    };
  }, []);

  const handleSelectMode = (newMode: 'SIMULATION' | 'LIVE_GATEWAY') => {
    setMode(newMode);
    setSimulationRunning(newMode === 'SIMULATION');
    dataService.setMode(newMode);
  };

  const handleConnectGateway = (url: string) => {
    setGatewayUrl(url);
    dataService.setGatewayUrl(url);
    handleSelectMode('LIVE_GATEWAY');
    setIsModalOpen(false);
  };

  // Interlinked Selection Handler (Synchronizes GIS Map, Strata Profile, and Telemetry cards)
  const handleSelectStation = (lat: number, lon: number, nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusCoords({ lat, lon });
  };

  const handleSelectScenario = (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setMode('SIMULATION');
    setSimulationRunning(true);
    dataService.setMode('SIMULATION', false);
    dataService.loadScenario(scenario);
    if (scenario === 'ROCKBURST_SUBSIDENCE') {
      setSelectedNodeId('NODE-1');
      setFocusCoords({ lat: 19.054400, lon: 73.068800 });
    } else if (scenario === 'METHANE_OUTBURST') {
      setSelectedNodeId('NODE-2');
      setFocusCoords({ lat: 19.054650, lon: 73.069050 });
    } else if (scenario === 'DEFAULT_DEMO') {
      setSelectedNodeId('NODE-3');
      setFocusCoords({ lat: 19.054900, lon: 73.069300 });
    }
  };

  const handleUpdateParam = (nodeIndex: number, field: keyof NodeData, val: number) => {
    dataService.updateNodeParameter(nodeIndex, field, val);
  };

  const aiAnalysis = generateAIAnalysis(nodes, alarm);

  return (
    <div className="app-container">
      {/* 1. Header Command Bar */}
      <Header
        mode={mode}
        gatewayUrl={gatewayUrl}
        connectionStatus={connectionStatus}
        lastHeartbeat={lastHeartbeat}
        connectionError={connectionError}
        onSelectMode={handleSelectMode}
        onOpenGatewayModal={() => setIsModalOpen(true)}
      />

      {/* Gateway Offline Alert Banner */}
      {mode === 'LIVE_GATEWAY' && connectionStatus === 'OFFLINE' && (
        <div className="gateway-offline-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>
              <strong>GATEWAY OFFLINE:</strong> Unable to reach ESP32-S3 Node-5 Gateway at{' '}
              <code>{gatewayUrl}</code>. Live polling active (1s interval). Ensure Wokwi simulation is running with port forwarding on port 8180.
            </span>
          </div>
          <button
            className="btn-action"
            style={{ padding: '0.2rem 0.65rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#fca5a5' }}
            onClick={() => dataService.pollLiveGateway()}
          >
            <RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Retry Now
          </button>
        </div>
      )}

      {/* 2. Critical Alert Hero (Activates on DANGER / WARNING) */}
      <CriticalAlertHero alarm={alarm} onFocusMap={handleSelectStation} />

      {/* 3. High-Level KPI Summary Cards */}
      <KpiMetrics nodes={nodes} alarm={alarm} />
      <IncidentTimeline />

      {/* 4. Top Primary Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            className={`mode-btn ${activeTab === 'GEOSPATIAL_SUBSURFACE' ? 'active' : ''}`}
            onClick={() => setActiveTab('GEOSPATIAL_SUBSURFACE')}
          >
            <Columns size={15} />
            Surface GIS & Underground Strata
          </button>
          <button
            className={`mode-btn ${activeTab === 'CHARTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('CHARTS')}
          >
            <TrendingUp size={15} />
            Telemetry Trends
          </button>
          <button
            className={`mode-btn ${activeTab === 'SIMULATOR' ? 'active' : ''}`}
            onClick={() => setActiveTab('SIMULATOR')}
          >
            <Sliders size={15} />
            Simulation Lab & LoRa Stream
          </button>
        </div>

        {/* View Mode Toggle: Grid Cards vs SCADA Table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
            TELEMETRY VIEW:
          </span>
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              className={`mode-btn ${stationListMode === 'CARDS' ? 'active' : ''}`}
              style={{ padding: '0.3rem 0.65rem' }}
              onClick={() => setStationListMode('CARDS')}
              title="Station Cards View"
            >
              <LayoutGrid size={14} />
              Cards
            </button>
            <button
              className={`mode-btn ${stationListMode === 'TABLE' ? 'active' : ''}`}
              style={{ padding: '0.3rem 0.65rem' }}
              onClick={() => setStationListMode('TABLE')}
              title="DGMS Tabular SCADA View"
            >
              <Table size={14} />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: INTERLINKED SURFACE GIS & SUBSURFACE STRATA */}
      {activeTab === 'GEOSPATIAL_SUBSURFACE' && (
        <>
          {/* Synchronized Station Quick Selection Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.55rem 0.85rem',
              flexWrap: 'wrap',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Interlinked Stations:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {nodes.map((node) => {
                  const isSelected = node.node === selectedNodeId;
                  const isDanger = node.status === 'DANGER';
                  const isWarning = node.status === 'WARNING';
                  const badgeColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

                  return (
                    <button
                      key={node.node}
                      onClick={() => handleSelectStation(node.latitude, node.longitude, node.node)}
                      style={{
                        background: isSelected ? 'rgba(14, 165, 233, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                        border: `1.5px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '6px',
                        padding: '0.25rem 0.65rem',
                        color: '#fff',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: isSelected ? '0 0 12px rgba(56,189,248,0.4)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: badgeColor,
                          boxShadow: `0 0 6px ${badgeColor}`,
                        }}
                      />
                      {node.node}
                      {isDanger ? ' (CRIT)' : isWarning ? ' (WARN)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout Split Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
                LAYOUT:
              </span>
              <button
                className={`btn-action ${geoViewMode === 'DUAL' ? 'active' : ''}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                onClick={() => setGeoViewMode('DUAL')}
              >
                <Columns size={12} />
                Dual Split
              </button>
              <button
                className={`btn-action ${geoViewMode === 'MAP_ONLY' ? 'active' : ''}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                onClick={() => setGeoViewMode('MAP_ONLY')}
              >
                <Map size={12} />
                GIS Map Only
              </button>
              <button
                className={`btn-action ${geoViewMode === 'STRATA_ONLY' ? 'active' : ''}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                onClick={() => setGeoViewMode('STRATA_ONLY')}
              >
                <Layers size={12} />
                Strata Only
              </button>
            </div>
          </div>

          {/* Interlinked Views: Dual Split, Map Only, or Strata Only */}
          {geoViewMode === 'DUAL' && (
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <MineMap
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                focusCoords={focusCoords}
                onSelectNode={handleSelectStation}
              />
              <TunnelSchematic
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectStation}
              />
            </section>
          )}

          {geoViewMode === 'MAP_ONLY' && (
            <section className="main-dashboard-grid">
              <MineMap
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                focusCoords={focusCoords}
                onSelectNode={handleSelectStation}
              />
              <LoRaTopology
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectStation}
              />
            </section>
          )}

          {geoViewMode === 'STRATA_ONLY' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <TunnelSchematic
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectStation}
              />
              <LoRaTopology
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectStation}
              />
            </section>
          )}

          {/* LoRa Mesh Multi-Hop Bar when in Dual mode */}
          {geoViewMode === 'DUAL' && (
            <LoRaTopology
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectStation}
            />
          )}

          {/* Stations View: Cards or Table */}
          {stationListMode === 'CARDS' ? (
            <NodeGrid
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onFocusMap={handleSelectStation}
            />
          ) : (
            <div>
              <div className="nodes-section-title" style={{ marginBottom: '0.75rem' }}>
                <h2>
                  <Activity size={22} color="#38bdf8" />
                  DGMS Mining Telemetry Compliance Table
                </h2>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#94a3b8' }}>
                  AUTOMATIC THRESHOLD COMPLIANCE CHECK • SIREN ACTIVE ON CRITICAL ONLY
                </span>
              </div>
              <NodeTable
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onFocusMap={handleSelectStation}
              />
            </div>
          )}

          <AIInsightsPanel
            networkAnalysis={null}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectStation}
          />
          <AiAdvisorPanel analysis={aiAnalysis} />
        </>
      )}

      {/* TAB 2: TELEMETRY TRENDS */}
      {activeTab === 'CHARTS' && (
        <>
          <TelemetryCharts
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectStation}
          />
          <NodeTable
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onFocusMap={handleSelectStation}
          />
          <AIInsightsPanel
            networkAnalysis={null}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectStation}
          />
          <AiAdvisorPanel analysis={aiAnalysis} />
        </>
      )}

      {/* TAB 3: SIMULATION LAB & LORA STREAM */}
      {activeTab === 'SIMULATOR' && (
        <section className="bottom-tools-grid">
          <SimulationLab
            nodes={nodes}
            onSelectScenario={handleSelectScenario}
            onUpdateParam={handleUpdateParam}
            simulationRunning={simulationRunning}
            selectedScenario={selectedScenario}
            onStopSimulation={() => { dataService.stopBackendScenario(); setSimulationRunning(false); }}
            onResetSimulation={() => { dataService.loadScenario(selectedScenario); setSimulationRunning(true); }}
          />
          <LoRaTerminal
            packets={packets}
            alerts={alerts}
            onClear={() => setPackets([])}
            onClearAlerts={() => dataService.clearAlertHistory()}
          />
        </section>
      )}

      {/* Gateway Configuration Dialog Modal */}
      <GatewayModal
        isOpen={isModalOpen}
        currentUrl={gatewayUrl}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnectGateway}
      />
    </div>
  );
};

export default App;
