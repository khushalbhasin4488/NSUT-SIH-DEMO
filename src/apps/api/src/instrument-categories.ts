export const INSTRUMENT_CATEGORIES = [
  { code: 'WEIGHING_SCALE', label: 'Weighing scale' },
  { code: 'WEIGHBRIDGE', label: 'Weighbridge' },
  { code: 'FUEL_DISPENSER', label: 'Fuel dispenser' },
  { code: 'WATER_METER', label: 'Water meter' },
  { code: 'GAS_METER', label: 'Gas meter' },
  { code: 'TAXI_METER', label: 'Taxi / auto meter' },
] as const;

export const INSTRUMENT_CATEGORY_CODES = INSTRUMENT_CATEGORIES.map((c) => c.code);

const ACTIVE_APPLICATION_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SCHEDULED'] as const;
export const ACTIVE_STATUSES: readonly string[] = ACTIVE_APPLICATION_STATUSES;
