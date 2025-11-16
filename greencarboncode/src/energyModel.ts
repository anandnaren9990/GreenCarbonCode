import { CarbonMetrics } from "./analyzer";

export interface EnergyReport {
  cpuSeconds: number;
  energyKWh: number;
}

export function estimateEnergy(metrics: CarbonMetrics): EnergyReport {
  // Approximate CPU time (seconds) based on code metrics
  const cpuSeconds =
      metrics.loops * 0.002 +
      metrics.conditions * 0.0008 +
      metrics.memoryAllocations * 0.0005 +
      metrics.ioOps * 0.0015 +
      metrics.functionCount * 0.0003 +
      metrics.lines * 0.00005;

  // CPU → kWh conversion (approx: 1 CPU-second ≈ 0.000000055 kWh)
  const energyKWh = cpuSeconds * 0.000000055;

  return { cpuSeconds, energyKWh };
}
