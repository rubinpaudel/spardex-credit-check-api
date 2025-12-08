/**
 * Creditsafe API Configuration
 */

export const creditsafeConfig = {
  baseUrl: process.env.CREDITSAFE_API_URL || "https://connect.creditsafe.com/v1",
  username: process.env.CREDITSAFE_USERNAME,
  password: process.env.CREDITSAFE_PASSWORD,
  timeout: 10000, // 10 seconds
};

export interface CreditsafeAuthResponse {
  token: string;
}

export interface CreditsafeCompanyResponse {
  creditRating: number;
  yearsActive: number;
  financialDisclosure: boolean;
  companyActive: boolean;
  taxWithholdingHit: boolean;
}
