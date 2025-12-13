import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { Elysia } from "elysia";
import { creditCheckRoutes } from "../../src/routes/credit-check";
import { errorHandler } from "../../src/middleware/errorHandler";

// Import test users
import testUsersData from "../fixtures/test-users.json";

// Mock modules before importing
import * as creditsafeClient from "../../src/services/creditsafe/client";
import * as viesClient from "../../src/services/vies/client";

interface TestUser {
  id: string;
  description: string;
  expectedTier: string;
  company: {
    vatNumber: string;
    name: string;
    legalForm: string;
  };
  questionnaire: Record<string, unknown>;
  mockCreditsafeResponse: {
    creditRating: number;
    creditRatingGrade: string;
    creditRatingDescription: string;
    companyAgeYears: number;
    legalForm: string;
    isActive: boolean;
    companyStatus: string;
    bankruptcies: Array<{
      type: string;
      date: string;
      status: string;
      yearsAgo: number;
    }>;
    fraudScore: number | null;
  };
}

const testUsers = testUsersData.testUsers as TestUser[];

// Create test app without auth middleware
const createTestApp = () => {
  return new Elysia()
    .use(errorHandler)
    .use(creditCheckRoutes);
};

describe("Credit Check Integration Tests", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  // Test each user
  testUsers.forEach((user) => {
    it(`should return ${user.expectedTier} for ${user.id}: ${user.description}`, async () => {
      // Mock Creditsafe getCompanyReportByVat to return our test data
      const mockReport = {
        report: {
          companyId: "test-id",
          companySummary: {
            businessName: user.company.name,
            country: "BE",
            companyNumber: user.company.vatNumber.slice(2),
            companyRegistrationNumber: user.company.vatNumber.slice(2),
            companyStatus: {
              status: user.mockCreditsafeResponse.companyStatus,
            },
          },
          companyIdentification: {
            basicInformation: {
              businessName: user.company.name,
              registeredCompanyName: user.company.name,
              companyRegistrationNumber: user.company.vatNumber.slice(2),
              vatRegistrationNumber: user.company.vatNumber,
              companyRegistrationDate: new Date(
                Date.now() - user.mockCreditsafeResponse.companyAgeYears * 365.25 * 24 * 60 * 60 * 1000
              ).toISOString(),
              legalForm: {
                description: user.mockCreditsafeResponse.legalForm,
                providerCode: user.mockCreditsafeResponse.legalForm,
              },
            },
          },
          creditScore: {
            currentCreditRating: {
              commonValue: user.mockCreditsafeResponse.creditRatingGrade,
              commonDescription: user.mockCreditsafeResponse.creditRatingDescription,
              creditLimit: { currency: "EUR", value: 10000 },
              providerValue: {
                maxValue: "100",
                minValue: "0",
                value: String(user.mockCreditsafeResponse.creditRating),
              },
            },
          },
          additionalInformation: user.mockCreditsafeResponse.fraudScore !== null
            ? {
                fraudScore: {
                  value: user.mockCreditsafeResponse.fraudScore,
                  description: "Fraud score",
                },
              }
            : undefined,
          directors: {
            currentDirectors: [],
          },
          negativeInformation: {
            bankruptcyInformation: user.mockCreditsafeResponse.bankruptcies.map((b) => ({
              type: b.type,
              date: b.date,
              status: b.status,
            })),
            ccjSummary: {
              numberOfExact: 0,
              numberOfPossible: 0,
            },
          },
        },
      };

      // Spy on the functions
      const getCompanyReportByVatSpy = spyOn(creditsafeClient, "getCompanyReportByVat")
        .mockResolvedValue(mockReport as any);

      const validateVatNumberSpy = spyOn(viesClient, "validateVatNumber")
        .mockResolvedValue({
          valid: true,
          companyName: user.company.name,
          companyAddress: "Test Address, Belgium",
        });

      // Build request
      const response = await app.handle(
        new Request("http://localhost/api/v1/credit-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: user.company,
            questionnaire: user.questionnaire,
          }),
        })
      );

      const result = await response.json();

      // Log for debugging on failure
      if (result.result?.tier !== user.expectedTier) {
        console.log(`\n=== FAILED: ${user.id} ===`);
        console.log("Description:", user.description);
        console.log("Expected:", user.expectedTier);
        console.log("Got:", result.result?.tier);
        console.log("\nRule Results:");
        result.result?.ruleResults?.forEach((r: any) => {
          const status = r.tier === "rejected" ? "REJECT" : r.tier;
          console.log(`  [${status.toUpperCase()}] ${r.ruleId}: ${r.reason}`);
        });
        console.log("");
      }

      // Assert
      expect(result.success).toBe(true);
      expect(result.result?.tier).toBe(user.expectedTier);

      // Restore mocks
      getCompanyReportByVatSpy.mockRestore();
      validateVatNumberSpy.mockRestore();
    });
  });

  // Additional edge case tests
  describe("Edge Cases", () => {
    it("should return manual_review when Creditsafe API fails", async () => {
      spyOn(creditsafeClient, "getCompanyReportByVat").mockResolvedValue(null);
      spyOn(viesClient, "validateVatNumber").mockResolvedValue({
        valid: true,
        companyName: "Test Company",
      });

      const response = await app.handle(
        new Request("http://localhost/api/v1/credit-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: {
              vatNumber: "BE0000000000",
              name: "Test Company",
              legalForm: "BV",
            },
            questionnaire: testUsers[0].questionnaire,
          }),
        })
      );

      const result = await response.json();
      expect(result.success).toBe(true);
      // Should be manual_review since Creditsafe data is required for many rules
      expect(result.result?.tier).toBe("manual_review");
    });

    it("should handle validation errors gracefully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/v1/credit-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: {
              // Missing required fields
              vatNumber: "INVALID",
            },
          }),
        })
      );

      // Elysia returns 422 for validation errors by default
      expect(response.status).toBe(422);
    });

    it("should allow tier override via query parameter", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/v1/credit-check?tier=poor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: {
              vatNumber: "BE0123456789",
              name: "Test Company",
              legalForm: "BV",
            },
            questionnaire: testUsers[0].questionnaire,
          }),
        })
      );

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.result?.tier).toBe("poor");
    });
  });
});
