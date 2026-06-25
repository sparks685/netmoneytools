export type FilingStatus = "single" | "married" | "hoh";
export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface TaxResult {
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalDeductions: number;
  netPay: number;
  effectiveTaxRate: number;
  employerCost: number;
}

const FREQUENCY_MULTIPLIER: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

const SS_WAGE_BASE_ANNUAL = 168600;
const SS_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const EMPLOYER_FICA_RATE = 0.0765;

interface Bracket {
  min: number;
  max: number;
  rate: number;
}

const FEDERAL_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
};

function calcFederalTax(annualGross: number, filingStatus: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  let tax = 0;
  for (const bracket of brackets) {
    if (annualGross <= bracket.min) break;
    const taxable = Math.min(annualGross, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

function calcFICA(annualGross: number): { ss: number; medicare: number } {
  const ssWages = Math.min(annualGross, SS_WAGE_BASE_ANNUAL);
  return {
    ss: ssWages * SS_RATE,
    medicare: annualGross * MEDICARE_RATE,
  };
}

export function calcPaycheck(
  grossPerPeriod: number,
  stateRate: number,
  filingStatus: FilingStatus,
  frequency: PayFrequency
): TaxResult {
  const periods = FREQUENCY_MULTIPLIER[frequency];
  const annualGross = grossPerPeriod * periods;

  const annualFederal = calcFederalTax(annualGross, filingStatus);
  const annualState = annualGross * stateRate;
  const { ss: annualSS, medicare: annualMedicare } = calcFICA(annualGross);

  const federalTax = annualFederal / periods;
  const stateTax = annualState / periods;
  const socialSecurity = annualSS / periods;
  const medicare = annualMedicare / periods;
  const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
  const netPay = grossPerPeriod - totalDeductions;
  const effectiveTaxRate = totalDeductions / grossPerPeriod;
  const employerCost = grossPerPeriod * (1 + EMPLOYER_FICA_RATE);

  return {
    grossPay: grossPerPeriod,
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    totalDeductions,
    netPay,
    effectiveTaxRate,
    employerCost,
  };
}

export function calcGrossUp(
  desiredNet: number,
  stateRate: number,
  filingStatus: FilingStatus,
  frequency: PayFrequency
): TaxResult {
  const periods = FREQUENCY_MULTIPLIER[frequency];

  let gross = desiredNet / (1 - 0.22 - stateRate - SS_RATE - MEDICARE_RATE);
  const tolerance = 0.01;
  const maxIterations = 200;

  for (let i = 0; i < maxIterations; i++) {
    const annualGross = gross * periods;
    const annualFederal = calcFederalTax(annualGross, filingStatus);
    const annualState = annualGross * stateRate;
    const { ss: annualSS, medicare: annualMedicare } = calcFICA(annualGross);

    const periodFederal = annualFederal / periods;
    const periodState = annualState / periods;
    const periodSS = annualSS / periods;
    const periodMedicare = annualMedicare / periods;

    const currentNet = gross - periodFederal - periodState - periodSS - periodMedicare;
    const diff = desiredNet - currentNet;

    if (Math.abs(diff) < tolerance) break;

    gross += diff * 0.9;
  }

  return calcPaycheck(gross, stateRate, filingStatus, frequency);
}
