export interface StateInfo {
  name: string;
  abbreviation: string;
  rate: number;
}

export const STATE_TAX_RATES: StateInfo[] = [
  { name: "Alabama", abbreviation: "AL", rate: 0.04 },
  { name: "Alaska", abbreviation: "AK", rate: 0.0 },
  { name: "Arizona", abbreviation: "AZ", rate: 0.025 },
  { name: "Arkansas", abbreviation: "AR", rate: 0.044 },
  { name: "California", abbreviation: "CA", rate: 0.093 },
  { name: "Colorado", abbreviation: "CO", rate: 0.044 },
  { name: "Connecticut", abbreviation: "CT", rate: 0.0699 },
  { name: "Delaware", abbreviation: "DE", rate: 0.066 },
  { name: "District of Columbia", abbreviation: "DC", rate: 0.0925 },
  { name: "Florida", abbreviation: "FL", rate: 0.0 },
  { name: "Georgia", abbreviation: "GA", rate: 0.0539 },
  { name: "Hawaii", abbreviation: "HI", rate: 0.0825 },
  { name: "Idaho", abbreviation: "ID", rate: 0.058 },
  { name: "Illinois", abbreviation: "IL", rate: 0.0495 },
  { name: "Indiana", abbreviation: "IN", rate: 0.0315 },
  { name: "Iowa", abbreviation: "IA", rate: 0.06 },
  { name: "Kansas", abbreviation: "KS", rate: 0.057 },
  { name: "Kentucky", abbreviation: "KY", rate: 0.04 },
  { name: "Louisiana", abbreviation: "LA", rate: 0.0425 },
  { name: "Maine", abbreviation: "ME", rate: 0.0715 },
  { name: "Maryland", abbreviation: "MD", rate: 0.0575 },
  { name: "Massachusetts", abbreviation: "MA", rate: 0.05 },
  { name: "Michigan", abbreviation: "MI", rate: 0.0425 },
  { name: "Minnesota", abbreviation: "MN", rate: 0.0785 },
  { name: "Mississippi", abbreviation: "MS", rate: 0.047 },
  { name: "Missouri", abbreviation: "MO", rate: 0.0495 },
  { name: "Montana", abbreviation: "MT", rate: 0.0675 },
  { name: "Nebraska", abbreviation: "NE", rate: 0.0684 },
  { name: "Nevada", abbreviation: "NV", rate: 0.0 },
  { name: "New Hampshire", abbreviation: "NH", rate: 0.0 },
  { name: "New Jersey", abbreviation: "NJ", rate: 0.0637 },
  { name: "New Mexico", abbreviation: "NM", rate: 0.059 },
  { name: "New York", abbreviation: "NY", rate: 0.0685 },
  { name: "North Carolina", abbreviation: "NC", rate: 0.045 },
  { name: "North Dakota", abbreviation: "ND", rate: 0.025 },
  { name: "Ohio", abbreviation: "OH", rate: 0.0375 },
  { name: "Oklahoma", abbreviation: "OK", rate: 0.0475 },
  { name: "Oregon", abbreviation: "OR", rate: 0.0875 },
  { name: "Pennsylvania", abbreviation: "PA", rate: 0.0307 },
  { name: "Rhode Island", abbreviation: "RI", rate: 0.0599 },
  { name: "South Carolina", abbreviation: "SC", rate: 0.065 },
  { name: "South Dakota", abbreviation: "SD", rate: 0.0 },
  { name: "Tennessee", abbreviation: "TN", rate: 0.0 },
  { name: "Texas", abbreviation: "TX", rate: 0.0 },
  { name: "Utah", abbreviation: "UT", rate: 0.0485 },
  { name: "Vermont", abbreviation: "VT", rate: 0.0875 },
  { name: "Virginia", abbreviation: "VA", rate: 0.0575 },
  { name: "Washington", abbreviation: "WA", rate: 0.0 },
  { name: "West Virginia", abbreviation: "WV", rate: 0.065 },
  { name: "Wisconsin", abbreviation: "WI", rate: 0.0584 },
  { name: "Wyoming", abbreviation: "WY", rate: 0.0 },
];

export const STATES_BY_ABBR: Record<string, StateInfo> = Object.fromEntries(
  STATE_TAX_RATES.map((s) => [s.abbreviation, s])
);

export const STATES_BY_SLUG: Record<string, StateInfo> = Object.fromEntries(
  STATE_TAX_RATES.map((s) => [s.name.toLowerCase().replace(/\s+/g, "-"), s])
);
