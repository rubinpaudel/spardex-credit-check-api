// Authentication
export interface CreditsafeAuthResponse {
  token: string;
  // Token is valid for 1 hour
}

// Company Search
export interface CreditsafeCompanySearchResult {
  companies: Array<{
    id: string; // connectId - used to fetch full report
    name: string;
    country: string;
    regNo: string; // Registration number
    vatNo?: string; // VAT number
    status: string; // "Active", "Inactive", etc.
    type: string; // Company type
    address: {
      simpleValue: string;
      city: string;
      postalCode: string;
    };
  }>;
  totalSize: number;
}

// Company Report (simplified - full report has many more fields)
export interface CreditsafeCompanyReport {
  report: {
    companyId: string;
    companySummary: {
      businessName: string;
      country: string;
      companyNumber: string;
      companyRegistrationNumber: string;
      vatRegistrationNumber?: string;
      companyStatus: {
        status: string; // "Active", "Inactive", "Dissolved", etc.
        description?: string;
      };
      latestTurnoverFigure?: {
        currency: string;
        value: number;
      };
      latestShareholdersEquityFigure?: {
        currency: string;
        value: number;
      };
    };
    companyIdentification: {
      basicInformation: {
        businessName: string;
        registeredCompanyName: string;
        companyRegistrationNumber: string;
        vatRegistrationNumber?: string;
        companyRegistrationDate: string; // ISO date - incorporation date
        legalForm: {
          description: string; // "BV", "NV", "VOF", etc.
          providerCode: string;
        };
        operationsDescription?: string;
        principalActivity?: {
          code: string;
          description: string;
        };
      };
      activityClassifications?: Array<{
        classification: string;
        activities: Array<{
          code: string;
          description: string;
        }>;
      }>;
    };
    creditScore: {
      currentCreditRating: {
        commonValue: string; // Letter grade: "A", "B", etc.
        commonDescription: string; // "Very Low Risk", etc.
        creditLimit?: {
          currency: string;
          value: number;
        };
        providerValue: {
          maxValue: string;
          minValue: string;
          value: string; // The actual score (0-100)
        };
      };
      currentContractLimit?: {
        currency: string;
        value: number;
      };
      previousCreditRating?: {
        commonValue: string;
        commonDescription: string;
      };
    };
    additionalInformation?: {
      fraudScore?: {
        value: number; // 0-100, higher = more risky
        description: string;
      };
    };
    directors: {
      currentDirectors: Array<{
        id: string;
        idType: string;
        name: string;
        firstName?: string;
        lastName?: string;
        gender?: string;
        dateOfBirth?: string;
        directorType: string; // "Director", "Administrator", etc.
        positions: Array<{
          positionName: string;
          dateAppointed: string; // When they became director
        }>;
      }>;
    };
    negativeInformation?: {
      ccjSummary?: {
        numberOfExact: number;
        numberOfPossible: number;
        dateOfMostRecent?: string;
        totalValue?: {
          currency: string;
          value: number;
        };
      };
      bankruptcyInformation?: Array<{
        type: string;
        date: string;
        status: string;
        // Person-level bankruptcy info
      }>;
    };
    extendedGroupStructure?: Array<{
      companyId: string;
      companyName: string;
      relationshipType: string;
    }>;
    financialStatements?: Array<{
      type: string;
      yearEndDate: string;
      numberOfWeeks: number;
      currency: string;
      consolidatedAccounts: boolean;
      profitAndLoss?: {
        revenue?: number;
        operatingProfit?: number;
        profitBeforeTax?: number;
        profitAfterTax?: number;
      };
      balanceSheet?: {
        totalAssets?: number;
        totalLiabilities?: number;
        totalShareholdersEquity?: number;
      };
    }>;
  };
}

// Error response
export interface CreditsafeErrorResponse {
  correlationId: string;
  message: string;
  details?: string;
}
