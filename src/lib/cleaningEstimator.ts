export type CleaningEstimateInput = {
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
  kitchen_condition: 'normal'|'greasy';
  clutter_level: 'tidy'|'normal'|'cluttered'|'very_cluttered';
  pets: 'none'|'one'|'two_plus'|'heavy_shedding';
  frequency: 'one_time'|'weekly'|'biweekly'|'monthly';
  service_type: 'standard_clean'|'deep_clean'|'move_in_out'|'post_renovation'|'rental_turnover';
  inside_fridge?: boolean;
  inside_oven?: boolean;
  interior_windows_count?: number; // groups of 5
  baseboards?: boolean;
  cabinet_fronts?: boolean;
  laundry_folding?: boolean;
  hourly_rate_cents: number;
  min_hours?: number;
};

export type CleaningEstimateResult = {
  raw_hours: number;
  estimated_hours: number; // rounded to 0.25h
  billable_hours: number;
  estimated_cost_cents: number;
};

export function roundToQuarterHour(n: number) {
  return Math.round(n * 4) / 4;
}

export function estimateCleaning(input: CleaningEstimateInput): CleaningEstimateResult {
  const {
    square_feet, bedrooms, bathrooms, kitchen_condition, clutter_level,
    pets, frequency, service_type, inside_fridge, inside_oven,
    interior_windows_count = 0, baseboards, cabinet_fronts, laundry_folding,
    hourly_rate_cents, min_hours = 2.0
  } = input;

  const base_hours = Math.max(1.0, square_feet / 500.0);
  const bedroom_hours = Math.max(0, bedrooms) * 0.50;
  const bathroom_hours = Math.max(0, bathrooms) * 0.75;
  const kitchen_hours = 0.50 + (kitchen_condition === 'greasy' ? 0.50 : 0);

  const add_ons_hours =
    (inside_fridge ? 0.50 : 0) +
    (inside_oven ? 0.75 : 0) +
    (interior_windows_count * 0.75) +   // per 5 windows
    (baseboards ? (square_feet / 1000.0) * 0.50 : 0) +
    (cabinet_fronts ? 0.50 : 0) +
    (laundry_folding ? 0.50 : 0);

  const type_multiplier = {
    standard_clean: 1.00,
    deep_clean: 1.25,
    move_in_out: 1.40,
    post_renovation: 1.40,
    rental_turnover: 1.15
  }[service_type];

  const clutter_multiplier = ({ tidy: 0.90, normal: 1.00, cluttered: 1.20, very_cluttered: 1.50 } as const)[clutter_level];
  const pet_multiplier = ({ none: 1.00, one: 1.05, two_plus: 1.10, heavy_shedding: 1.15 } as const)[pets];
  const frequency_multiplier = ({ one_time: 1.15, weekly: 0.85, biweekly: 1.00, monthly: 1.10 } as const)[frequency];

  const raw_hours = (base_hours + bedroom_hours + bathroom_hours + kitchen_hours + add_ons_hours)
    * type_multiplier * clutter_multiplier * pet_multiplier * frequency_multiplier;

  const estimated_hours = roundToQuarterHour(raw_hours);
  const billable_hours = Math.max(estimated_hours, min_hours);
  const estimated_cost_cents = Math.round(billable_hours * hourly_rate_cents);

  return { raw_hours, estimated_hours, billable_hours, estimated_cost_cents };
}
