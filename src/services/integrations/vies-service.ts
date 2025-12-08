/**
 * VIES (VAT Information Exchange System) Integration Service
 * Validates EU VAT numbers through the official EU VIES system
 */

import {
  viesConfig,
  type ViesValidationResponse,
} from "../../config/vies-config";

/**
 * Validate VAT number through VIES API
 */
export async function validateVatNumber(
  vatNumber: string
): Promise<ViesValidationResponse> {
  try {
    // Parse VAT number (format: BE0123456789)
    const countryCode = vatNumber.substring(0, 2).toUpperCase();
    const vatOnly = vatNumber.substring(2);

    // VIES REST API endpoint
    const url = `${viesConfig.baseUrl}/ms/${countryCode}/vat/${vatOnly}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(viesConfig.timeout),
    });

    if (!response.ok) {
      // VIES returns 404 for invalid VAT numbers
      if (response.status === 404) {
        return {
          valid: false,
          countryCode,
          vatNumber: vatOnly,
          requestDate: new Date().toISOString(),
        };
      }

      throw new Error(
        `VIES API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      valid: data.valid === true,
      name: data.name || undefined,
      address: data.address || undefined,
      countryCode: data.countryCode || countryCode,
      vatNumber: data.vatNumber || vatOnly,
      requestDate: data.requestDate || new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle timeout and network errors
      if (
        error.name === "AbortError" ||
        error.name === "TimeoutError"
      ) {
        throw new Error("VIES API timeout - service may be unavailable");
      }
      throw new Error(`VIES API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Alternative SOAP-based VIES validation (fallback)
 * Note: The REST API is preferred, but SOAP can be used as fallback
 */
export async function validateVatNumberSOAP(
  vatNumber: string
): Promise<ViesValidationResponse> {
  try {
    const countryCode = vatNumber.substring(0, 2).toUpperCase();
    const vatOnly = vatNumber.substring(2);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${countryCode}</countryCode>
      <vatNumber>${vatOnly}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "",
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(viesConfig.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(
        `VIES SOAP request failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();

    // Parse SOAP response (simple XML parsing)
    const valid = xmlText.includes("<valid>true</valid>");
    const nameMatch = xmlText.match(/<name>(.*?)<\/name>/);
    const addressMatch = xmlText.match(/<address>(.*?)<\/address>/);

    return {
      valid,
      name: nameMatch ? nameMatch[1] : undefined,
      address: addressMatch ? addressMatch[1] : undefined,
      countryCode,
      vatNumber: vatOnly,
      requestDate: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`VIES SOAP API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate VAT number with automatic fallback to SOAP if REST fails
 */
export async function validateVatNumberWithFallback(
  vatNumber: string
): Promise<ViesValidationResponse> {
  try {
    // Try REST API first
    return await validateVatNumber(vatNumber);
  } catch (error) {
    console.warn("VIES REST API failed, trying SOAP fallback:", error);
    // Fallback to SOAP
    return await validateVatNumberSOAP(vatNumber);
  }
}

/**
 * Mock implementation for testing
 */
export function getMockVatValidation(
  vatNumber: string
): ViesValidationResponse {
  const countryCode = vatNumber.substring(0, 2).toUpperCase();
  const vatOnly = vatNumber.substring(2);

  // Mock: Consider valid if VAT number contains only digits after country code
  const valid = /^\d+$/.test(vatOnly) && vatOnly.length >= 9;

  return {
    valid,
    name: valid ? "Mock Company Name BVBA" : undefined,
    address: valid ? "Mock Street 123, 1000 Brussels, Belgium" : undefined,
    countryCode,
    vatNumber: vatOnly,
    requestDate: new Date().toISOString(),
  };
}
