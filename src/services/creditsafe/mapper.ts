import { CreditsafeCompanyReport } from "./types";

/**
 * Our normalized Creditsafe data structure.
 * Used by rules for evaluation.
 */
export interface CreditsafeData {
  // Company basics
  companyName: string;
  vatNumber: string | null;
  registrationNumber: string;
  incorporationDate: string; // ISO date
  companyAgeYears: number; // Calculated
  legalForm: string; // "BV", "NV", etc.
  isActive: boolean;
  companyStatus: string; // Raw status string

  // Credit
  creditRating: number; // 0-100
  creditRatingGrade: string; // "A", "B", etc.
  creditRatingDescription: string; // "Very Low Risk", etc.
  creditLimit: number | null; // In EUR

  // Fraud
  fraudScore: number | null; // 0-100, higher = more risky
  fraudDescription: string | null;

  // Directors
  directors: Array<{
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    type: string;
    dateAppointed: string;
    appointedYearsAgo: number; // Calculated
  }>;

  // Negative information
  bankruptcies: Array<{
    type: string;
    date: string;
    status: string;
    yearsAgo: number; // Calculated
  }>;
  totalBankruptcies: number;

  // Flags
  hasCCJs: boolean; // County Court Judgments
  ccjCount: number;
  hasFinancialDisclosure: boolean; // Has filed financial statements

  // Raw report for debugging
  _raw?: CreditsafeCompanyReport;
}

/**
 * Calculate years between a date and now.
 */
function yearsSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const years =
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, years);
}

/**
 * Normalize Belgian legal form descriptions to standard codes.
 */
function normalizeLegalForm(description: string): string {
  const normalized = description.toUpperCase().trim();

  // Map common variations to standard codes
  const mappings: Record<string, string> = {
    // BV / SRL
    BV: "BV",
    BVBA: "BV",
    SRL: "BV",
    SPRL: "BV",
    "BESLOTEN VENNOOTSCHAP": "BV",
    "SOCIÉTÉ À RESPONSABILITÉ LIMITÉE": "BV",
    "PRIVATE COMPANY": "BV",

    // NV / SA
    NV: "NV",
    SA: "NV",
    "NAAMLOZE VENNOOTSCHAP": "NV",
    "SOCIÉTÉ ANONYME": "NV",

    // VOF / SNC
    VOF: "VOF",
    SNC: "VOF",
    "VENNOOTSCHAP ONDER FIRMA": "VOF",
    "SOCIÉTÉ EN NOM COLLECTIF": "VOF",

    // CommV / SComm
    COMMV: "CommV",
    "COMM.V": "CommV",
    SCOMM: "CommV",
    "COMMANDITAIRE VENNOOTSCHAP": "CommV",
    "SOCIÉTÉ EN COMMANDITE": "CommV",

    // CV / SC
    CV: "CV",
    SC: "CV",
    "COÖPERATIEVE VENNOOTSCHAP": "CV",
    "SOCIÉTÉ COOPÉRATIVE": "CV",

    // VZW / ASBL
    VZW: "VZW",
    ASBL: "VZW",
    "VERENIGING ZONDER WINSTOOGMERK": "VZW",
    "ASSOCIATION SANS BUT LUCRATIF": "VZW",

    // Eenmanszaak
    EENMANSZAAK: "Eenmanszaak",
    "ENTREPRISE INDIVIDUELLE": "Eenmanszaak",
    "SOLE PROPRIETORSHIP": "Eenmanszaak",
    "PHYSICAL PERSON": "Eenmanszaak",
  };

  // Try exact match first
  if (mappings[normalized]) {
    return mappings[normalized];
  }

  // Try partial match
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  // Return original if no match
  return description;
}

/**
 * Map Creditsafe API response to our internal structure.
 */
export function mapCreditsafeResponse(
  report: CreditsafeCompanyReport,
  includeRaw: boolean = false
): CreditsafeData {
  const r = report.report;
  const basic = r.companyIdentification.basicInformation;
  const summary = r.companySummary;
  const credit = r.creditScore.currentCreditRating;

  // Parse credit rating - Creditsafe returns as string
  const creditRating = parseInt(credit.providerValue.value, 10) || 0;

  // Map directors
  const directors = r.directors.currentDirectors.map((d) => ({
    id: d.id,
    name: d.name,
    firstName: d.firstName ?? null,
    lastName: d.lastName ?? null,
    dateOfBirth: d.dateOfBirth ?? null,
    type: d.directorType,
    dateAppointed: d.positions[0]?.dateAppointed ?? "",
    appointedYearsAgo: d.positions[0]?.dateAppointed
      ? yearsSince(d.positions[0].dateAppointed)
      : 0,
  }));

  // Map bankruptcies
  const bankruptcies = (r.negativeInformation?.bankruptcyInformation ?? []).map(
    (b) => ({
      type: b.type,
      date: b.date,
      status: b.status,
      yearsAgo: yearsSince(b.date),
    })
  );

  // Determine company status
  const statusString = summary.companyStatus.status.toLowerCase();
  const isActive = statusString === "active" || statusString === "actief";

  // Map legal form to our standard codes
  const legalFormRaw = basic.legalForm.description;
  const legalForm = normalizeLegalForm(legalFormRaw);

  return {
    companyName: basic.businessName || basic.registeredCompanyName,
    vatNumber: basic.vatRegistrationNumber ?? null,
    registrationNumber: basic.companyRegistrationNumber,
    incorporationDate: basic.companyRegistrationDate,
    companyAgeYears: yearsSince(basic.companyRegistrationDate),
    legalForm,
    isActive,
    companyStatus: summary.companyStatus.status,

    creditRating,
    creditRatingGrade: credit.commonValue,
    creditRatingDescription: credit.commonDescription,
    creditLimit: credit.creditLimit?.value ?? null,

    fraudScore: r.additionalInformation?.fraudScore?.value ?? null,
    fraudDescription: r.additionalInformation?.fraudScore?.description ?? null,

    directors,

    bankruptcies,
    totalBankruptcies: bankruptcies.length,

    hasCCJs: (r.negativeInformation?.ccjSummary?.numberOfExact ?? 0) > 0,
    ccjCount: r.negativeInformation?.ccjSummary?.numberOfExact ?? 0,

    // Financial disclosure check - has filed if:
    // 1. Has financial statements, OR
    // 2. Has shareholders equity figure in summary
    hasFinancialDisclosure:
      (r.financialStatements && r.financialStatements.length > 0) ||
      summary.latestShareholdersEquityFigure !== undefined,

    _raw: includeRaw ? report : undefined,
  };
}

/**
 * Count bankruptcies within a scope period.
 *
 * @param bankruptcies - List of bankruptcies
 * @param scopeYears - How many years back to count
 * @returns Count of bankruptcies within scope
 */
export function countBankruptciesInScope(
  bankruptcies: CreditsafeData["bankruptcies"],
  scopeYears: number
): number {
  return bankruptcies.filter((b) => b.yearsAgo <= scopeYears).length;
}

/**
 * Find director by name (for matching contact to director).
 */
export function findDirectorByName(
  directors: CreditsafeData["directors"],
  firstName: string,
  lastName: string
): CreditsafeData["directors"][0] | null {
  const searchFirst = firstName.toLowerCase();
  const searchLast = lastName.toLowerCase();

  return (
    directors.find((d) => {
      // Try firstName/lastName fields
      if (d.firstName && d.lastName) {
        return (
          d.firstName.toLowerCase() === searchFirst &&
          d.lastName.toLowerCase() === searchLast
        );
      }

      // Fall back to full name
      const fullName = d.name.toLowerCase();
      return fullName.includes(searchFirst) && fullName.includes(searchLast);
    }) ?? null
  );
}
