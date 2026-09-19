import { useSimulation } from '../contexts/SimulationContext';

/**
 * useDataFusion
 * 
 * Merges real backend data with the centralized simulation engine.
 * Rule: If real data is populated, it takes priority over demo data.
 * If demo mode is active and real data is missing/empty, it returns the simulated slice.
 * 
 * @param {Array|Object} realData - The real data fetched from the API
 * @param {String} simulationKey - The key in SimulationContext to pull fallback data from (e.g. 'cameras', 'events')
 * @returns {Array|Object} - The resolved data to render
 */
export function useDataFusion(realData, simulationKey) {
  const sim = useSimulation();
  
  if (!sim) {
    // Context might not be available in some scopes, fallback gracefully
    return realData;
  }

  const { isDemoMode, ...simData } = sim;
  const mockData = simData[simulationKey];

  // Logic: 
  // If we have real data (and it has length > 0 for arrays, or is truthy for objects), we use it.
  // Exception: if realData is specifically an empty array but the API request finished successfully,
  // we MIGHT want to show it as empty. However, for a persistent demo environment, if realData is empty 
  // and demoMode is ON, we show demo data to keep the UI active.

  const hasRealData = Array.isArray(realData) 
    ? realData.length > 0 
    : (realData !== null && realData !== undefined && Object.keys(realData).length > 0);

  if (hasRealData) {
    // Optional: We can inject a flag into the data to indicate it's real, but it's not strictly necessary.
    return realData;
  }

  if (isDemoMode && mockData) {
    // If it's mock data, we can optionally attach a `_isSimulated` flag if components need to know
    if (Array.isArray(mockData)) {
      return mockData.map(item => ({ ...item, _isSimulated: true }));
    }
    return { ...mockData, _isSimulated: true };
  }

  // Fallback to realData (even if empty) if demo mode is off
  return realData;
}
