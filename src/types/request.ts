// Contact information from questionnaire
export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // ISO date: "1985-03-15"
  nationality: string; // ISO country: "BE"
  belgiumResident: boolean;
  isAdministrator: boolean;
  driversLicenseSinceYears: number; // How many years they've had license
  adminTrackRecordYearsBelgium: number;
}

// Legal/compliance history
export interface LegalHistory {
  contactWithLegalAuthorities: boolean;
  troubleWithPaymentAtFinancingCompany: boolean;
  blacklistedBanks: string[]; // Empty array if none
}

// Driving/accident history
export interface InsuranceHistory {
  accidentsAtFault: number; // Count in scope period
  accidentsNotAtFault: number;
  accidentScopeYears: number; // How many years back we're looking
}

// Vehicle being financed
export interface VehicleInfo {
  type: "new" | "secondHand";
  horsepower: number;
  value: number; // In EUR
  mileage: number; // In km
  ageYears: number; // 0 for new, 0.5 = 6 months, etc.
}

// Self-declared debt status (we don't have API access)
export interface WithholdingObligationInfo {
  selfDeclaredDebt: boolean; // "Do you have debts at RSZ/FOD?"
}

// TEMPORARY: Mock data until Creditsafe integration
export interface MockData {
  creditRating?: number; // 0-100
  fraudScore?: number; // 0-100
  companyAgeYears?: number;
  adminBankruptcies?: number;
  sanctionListHit?: boolean;
  blocklistHit?: boolean;
}

// Full questionnaire
export interface QuestionnaireData {
  contact: ContactInfo;
  legalHistory: LegalHistory;
  insuranceHistory: InsuranceHistory;
  vehicle: VehicleInfo;
  withholdingObligation: WithholdingObligationInfo;

  // TEMPORARY: Mock data until Creditsafe integration
  _mock?: MockData;
}

// Company identification
export interface CompanyInfo {
  vatNumber: string; // Format: "BE0123456789"
  name: string;
  legalForm: string; // "BV", "NV", "VOF", etc.
}

// Complete request
export interface CreditCheckRequest {
  company: CompanyInfo;
  questionnaire: QuestionnaireData;
}
