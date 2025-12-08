/**
 * VIES (VAT Information Exchange System) API Configuration
 */

export const viesConfig = {
  baseUrl: "https://ec.europa.eu/taxation_customs/vies/rest-api",
  timeout: 10000, // 10 seconds
};

export interface ViesValidationResponse {
  valid: boolean;
  name?: string;
  address?: string;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
}
