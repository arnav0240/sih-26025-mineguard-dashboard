/**
 * MineGuard Mine Subsidence - API Client
 * Centralized service for fetching live telemetry from Node-5 Gateway
 */

import { GatewayNetworkPayload } from '../types';

/**
 * Fetches latest 5-node telemetry from the ESP32 gateway.
 * Defaults to '/api/nodes' which is routed to http://localhost:8180 via Vite proxy.
 */
export async function fetchNodeData(endpoint: string = '/api/nodes'): Promise<GatewayNetworkPayload> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gateway HTTP error: ${response.status} ${response.statusText}`);
  }

  const data: GatewayNetworkPayload = await response.json();
  
  if (!data || !Array.isArray(data.nodes)) {
    throw new Error('Invalid gateway response format: expected "nodes" array');
  }

  return data;
}
