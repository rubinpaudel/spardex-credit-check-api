/**
 * Script to generate a business-friendly Excel report with test user evaluations.
 * Creates one sheet per test user with a simple, easy-to-verify format.
 *
 * Run with: bun run scripts/generate-test-report.ts
 */

import * as XLSX from "xlsx";
import testUsersData from "../tests/fixtures/test-users.json";
import { Tier } from "../src/types/tiers";
import { RuleContext, RuleResult } from "../src/types/rules";
import { allRules } from "../src/rules/registry";
import { evaluateAllRules, aggregateResults } from "../src/rules/engine";
import { CreditsafeData } from "../src/services/creditsafe/mapper";
import { getFinancialTerms } from "../src/config/tier-config";
import { QuestionnaireData } from "../src/types/request";

interface TestUser {
  id: string;
  description: string;
  expectedTier: string;
  company: {
    vatNumber: string;
    name: string;
    legalForm: string;
  };
  questionnaire: {
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      nationality: string;
      belgiumResident: boolean;
      isAdministrator: boolean;
      driversLicenseSinceYears: number;
      adminTrackRecordYearsBelgium: number;
    };
    legalHistory: {
      contactWithLegalAuthorities: boolean;
      troubleWithPaymentAtFinancingCompany: boolean;
      blacklistedBanks: string[];
    };
    insuranceHistory: {
      driverAge: number;
      licenseYears: number;
      accidentsAtFault: number;
      accidentsNotAtFault: number;
      accidentScopeYears: number;
    };
    vehicle: {
      type: string;
      horsepower: number;
      value: number;
      mileage: number;
      ageYears: number;
    };
    withholdingObligation: {
      selfDeclaredDebt: boolean;
    };
  };
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

// Tier name mapping
const tierNameMap: Record<number, string> = {
  [Tier.REJECTED]: "REJECTED",
  [Tier.MANUAL_REVIEW]: "MANUAL REVIEW",
  [Tier.POOR]: "POOR",
  [Tier.FAIR]: "FAIR",
  [Tier.GOOD]: "GOOD",
  [Tier.EXCELLENT]: "EXCELLENT",
};

// Build Creditsafe data from test user mock response
function buildCreditsafeData(user: TestUser): CreditsafeData {
  const mock = user.mockCreditsafeResponse;
  const incorporationDate = new Date(
    Date.now() - mock.companyAgeYears * 365.25 * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    companyName: user.company.name,
    vatNumber: user.company.vatNumber,
    registrationNumber: user.company.vatNumber.slice(2),
    incorporationDate,
    companyAgeYears: mock.companyAgeYears,
    legalForm: mock.legalForm,
    isActive: mock.isActive,
    companyStatus: mock.companyStatus,
    creditRating: mock.creditRating,
    creditRatingGrade: mock.creditRatingGrade,
    creditRatingDescription: mock.creditRatingDescription,
    creditLimit: null,
    fraudScore: mock.fraudScore,
    fraudDescription: mock.fraudScore !== null ? "Test fraud score" : null,
    directors: [],
    bankruptcies: mock.bankruptcies.map((b) => ({
      type: b.type,
      date: b.date,
      status: b.status,
      yearsAgo: b.yearsAgo,
    })),
    totalBankruptcies: mock.bankruptcies.length,
    hasCCJs: false,
    ccjCount: 0,
  };
}

// Build RuleContext from test user
function buildRuleContext(user: TestUser): RuleContext {
  return {
    questionnaire: user.questionnaire as QuestionnaireData,
    company: user.company,
    creditsafe: buildCreditsafeData(user),
    vies: {
      valid: true,
      companyName: user.company.name,
      companyAddress: "Test Address, Belgium",
      apiCallFailed: false,
    },
    creditsafeFailed: false,
    viesFailed: false,
  };
}

// Evaluate a test user and get results
function evaluateUser(user: TestUser): {
  ruleResults: RuleResult[];
  finalTier: Tier;
  tierName: string;
} {
  const context = buildRuleContext(user);
  const ruleResults = evaluateAllRules(allRules, context);
  const { finalTier } = aggregateResults(ruleResults);

  return {
    ruleResults,
    finalTier,
    tierName: tierNameMap[finalTier] || "UNKNOWN",
  };
}

// Get tier color for styling
function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    EXCELLENT: "00AA00", // Green
    GOOD: "88CC00", // Light green
    FAIR: "FFAA00", // Orange
    POOR: "FF6600", // Dark orange
    REJECTED: "FF0000", // Red
    "MANUAL REVIEW": "AA00AA", // Purple
  };
  return colors[tier] || "000000";
}

// Create Excel workbook with business-friendly format
function generateExcelReport() {
  const workbook = XLSX.utils.book_new();

  for (const user of testUsers) {
    console.log(`Processing ${user.id}...`);
    const evaluation = evaluateUser(user);
    const expectedTier = user.expectedTier.toUpperCase();
    const passed = evaluation.tierName === expectedTier;

    // Create sheet data with simple columns
    const sheetData: (string | number | boolean)[][] = [];

    // Title row
    sheetData.push([
      `${user.id} - ${user.company.name}`,
      "",
      "",
      "",
      "",
      "",
    ]);
    sheetData.push([user.description, "", "", "", "", ""]);
    sheetData.push([]); // Empty row

    // Header row
    sheetData.push([
      "Check",
      "Value",
      "Data Source",
      "Rule Tier",
      "Explanation",
      "Result",
    ]);

    // Add each rule result as a row
    for (const rule of evaluation.ruleResults) {
      const ruleTier = tierNameMap[rule.tier] || "UNKNOWN";
      const result = rule.passed ? "PASS" : "FAIL";

      // Determine data source based on rule category
      let dataSource = "Questionnaire";
      if (
        rule.ruleId === "credit-rating" ||
        rule.ruleId === "company-age" ||
        rule.ruleId === "company-active" ||
        rule.ruleId === "admin-bankruptcies" ||
        rule.ruleId === "fraud-score" ||
        rule.ruleId === "legal-form"
      ) {
        dataSource = "Creditsafe";
      } else if (rule.ruleId === "vat-valid") {
        dataSource = "VIES";
      }

      // Format the check name nicely
      const checkName = rule.ruleId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Format actual value - handle objects properly based on rule type
      let formattedValue: string;
      const val = rule.actualValue;
      if (val === null || val === undefined) {
        formattedValue = "N/A";
      } else if (typeof val === "object" && !Array.isArray(val)) {
        // Handle specific rule value objects
        const obj = val as Record<string, unknown>;

        if ("creditRating" in obj) {
          // Credit rating rule: {creditRating, grade, description}
          formattedValue = `${obj.creditRating} (${obj.grade})`;
        } else if ("years" in obj) {
          // Company age rule: {years, incorporationDate}
          formattedValue = `${Number(obj.years).toFixed(1)} years`;
        } else if ("count" in obj && "scopeYears" in obj) {
          // Admin bankruptcies rule: {count, scopeYears, bankruptcies}
          formattedValue = `${obj.count} (in ${obj.scopeYears}yr scope)`;
        } else if ("fraudScore" in obj) {
          // Fraud score rule: {fraudScore, description}
          formattedValue = obj.fraudScore !== null ? String(obj.fraudScore) : "N/A";
        } else if ("valid" in obj && typeof obj.valid === "boolean") {
          // VIES result: {valid, name}
          formattedValue = obj.valid ? "Valid" : "Invalid";
        } else if ("mileage" in obj) {
          // Vehicle mileage: {mileage, isNew}
          formattedValue = obj.isNew ? "New vehicle" : `${obj.mileage} km`;
        } else if ("ageYears" in obj) {
          // Vehicle age: {ageYears, isNew}
          formattedValue = obj.isNew ? "New vehicle" : `${obj.ageYears} years`;
        } else {
          // Fallback for unknown objects
          formattedValue = JSON.stringify(val);
        }
      } else if (Array.isArray(val)) {
        formattedValue = val.length > 0 ? val.join(", ") : "None";
      } else if (typeof val === "boolean") {
        formattedValue = val ? "Yes" : "No";
      } else {
        formattedValue = String(val);
      }

      sheetData.push([
        checkName,
        formattedValue,
        dataSource,
        ruleTier,
        rule.reason,
        result,
      ]);
    }

    // Add empty rows before summary
    sheetData.push([]);
    sheetData.push([]);

    // Summary section
    sheetData.push(["SUMMARY", "", "", "", "", ""]);
    sheetData.push([]);
    sheetData.push(["Expected Tier:", expectedTier, "", "", "", ""]);
    sheetData.push(["Calculated Tier:", evaluation.tierName, "", "", "", ""]);
    sheetData.push([
      "Test Result:",
      passed ? "PASS" : "FAIL",
      "",
      "",
      "",
      "",
    ]);

    // Financial terms if applicable
    const ft = getFinancialTerms(evaluation.finalTier);
    if (ft) {
      sheetData.push([]);
      sheetData.push(["FINANCIAL TERMS", "", "", "", "", ""]);
      sheetData.push(["Interest Rate:", `${ft.yearlyInterestPercent}%`, "", "", "", ""]);
      sheetData.push(["Min Downpayment:", `${ft.minDownpaymentPercent}%`, "", "", "", ""]);
      sheetData.push([
        "Max Period:",
        `${ft.maxFinancingPeriodMonths} months`,
        "",
        "",
        "",
        "",
      ]);
      sheetData.push([
        "Max Residual:",
        `${ft.maxResidualValuePercent}%`,
        "",
        "",
        "",
        "",
      ]);
      sheetData.push([
        "Reg. Tax Financing:",
        ft.canFinanceRegistrationTax ? "Yes" : "No",
        "",
        "",
        "",
        "",
      ]);
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 }, // Check
      { wch: 20 }, // Value
      { wch: 15 }, // Data Source
      { wch: 15 }, // Rule Tier
      { wch: 50 }, // Explanation
      { wch: 10 }, // Result
    ];

    // Apply styling using cell properties
    // Note: xlsx library has limited styling support, but we can set some basic properties

    // Style the header row (row 4, index 3)
    const headerRowIndex = 3;
    const headerCells = ["A", "B", "C", "D", "E", "F"];
    headerCells.forEach((col) => {
      const cellRef = `${col}${headerRowIndex + 1}`;
      if (!worksheet[cellRef]) return;
      worksheet[cellRef].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "4472C4" } },
      };
    });

    // Style the summary section
    const summaryRowStart = sheetData.findIndex(
      (row) => row[0] === "SUMMARY"
    );
    if (summaryRowStart >= 0) {
      const summaryCell = `A${summaryRowStart + 1}`;
      if (worksheet[summaryCell]) {
        worksheet[summaryCell].s = { font: { bold: true, sz: 14 } };
      }

      // Style the calculated tier cell with color
      const tierRowIndex = summaryRowStart + 3;
      const tierCell = `B${tierRowIndex + 1}`;
      if (worksheet[tierCell]) {
        const tierColor = getTierColor(evaluation.tierName);
        worksheet[tierCell].s = {
          font: { bold: true, color: { rgb: tierColor } },
        };
      }

      // Style the test result
      const resultRowIndex = summaryRowStart + 4;
      const resultCell = `B${resultRowIndex + 1}`;
      if (worksheet[resultCell]) {
        const resultColor = passed ? "00AA00" : "FF0000";
        worksheet[resultCell].s = {
          font: { bold: true, color: { rgb: resultColor } },
        };
      }
    }

    // Add sheet to workbook
    const sheetName = user.id.replace("TEST_USER_", "User ");
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Write file
  const outputPath = "./test-users-report.xlsx";
  XLSX.writeFile(workbook, outputPath);
  console.log(`\nExcel report generated: ${outputPath}`);
  console.log(`Contains ${testUsers.length} sheets (one per test user)`);
}

// Run
generateExcelReport();
