export function estimateCarbonFromEnergy(energyKWh: number): number {
  // Global average carbon intensity: 475 g CO₂ per kWh
  const CARBON_INTENSITY = 475;

  return energyKWh * CARBON_INTENSITY; // in grams
}
