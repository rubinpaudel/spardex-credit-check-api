export interface ViesResponse {
  isValid: boolean;
  requestDate: string;
  userError?: string;
  name?: string;
  address?: string;
  requestIdentifier?: string;
}

export interface ViesResult {
  valid: boolean;
  companyName?: string;
  companyAddress?: string;
  error?: string;
}
