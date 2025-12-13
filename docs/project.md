# Vehicle Lease Credit Check System

## Overview

This system is an automated credit check service for Belgian companies (primarily BV/SRL entities) applying for vehicle leasing. The system evaluates applicants through a multi-step questionnaire combined with external data enrichment to determine their credit tier and applicable financing terms.

## Business Context

When a Belgian company wants to lease a vehicle, they must undergo a credit assessment. This system automates that process by:

1. Collecting company and administrator information via a questionnaire
2. Enriching data with external API calls (Creditsafe, VIES)
3. Running the data through a rule engine
4. Returning a tier classification with corresponding financial terms

## Tier System

Applicants are classified into one of the following tiers (from best to worst):

| Tier | Interest Rate | Downpayment | Description |
|------|---------------|-------------|-------------|
| **Excellent** | 3% | 0% | Premium customers with excellent credit history |
| **Good** | 5.5% | 0% | Solid companies with good track record |
| **Fair** | 12% | 10% | Acceptable risk with some limitations |
| **Poor** | 22% | 20% | High risk, strict conditions apply |
| **Manual Review** | - | - | Requires human assessment |
| **Rejected** | - | - | Does not meet minimum criteria |

## Rule Categories

The system evaluates applicants across multiple categories:

### 1. General Requirements (Questionnaire)
- Belgium residency (required for all tiers)
- Age ≥ 18 years
- Contact must be administrator of the company
- No contact with legal authorities (Poor: manual review)
- No payment trouble at other financing companies (Poor: manual review)
- Not on blacklisted banks list (Poor: manual review)

### 2. Company Check (Creditsafe + VIES)
- Credit rating threshold: Excellent ≥90, Good ≥70, Fair ≥50, Poor ≥30
- Minimum company age: Excellent 5yr, Good 3yr, Fair 2yr, Poor 1yr
- Financial disclosure required: Excellent/Good only
- Company registration must be active
- WitholdingObligation hit: Only allowed for Poor tier
- VAT number validation: Required (Poor: manual if invalid)

### 3. Admin Check (Creditsafe + Questionnaire)
- Maximum bankruptcies: Excellent 0, Good 1, Fair 2, Poor 3
- Bankruptcy scope years: Excellent 10yr, Good 7yr, Fair 5yr, Poor 3yr
- Admin track record in Belgium: Excellent/Good/Fair 3yr, Poor 0.5yr

### 4. Insurance Check (Questionnaire) - Only applies to Poor tier
- Driver's license ≥ 5 years
- Max accidents at fault: 3
- Max accidents not at fault: 5
- Accident scope: 2 years
- Max vehicle horsepower: 150
- Min driver age: 25

### 5. Asset Check (Questionnaire)
- New vehicles allowed: All tiers
- Second-hand allowed: Good/Fair/Poor only (not Excellent)
- Max second-hand age: Good/Fair 0.5yr, Poor 3yr
- Min vehicle value: Excellent/Good/Fair €10,000, Poor €20,000
- Max mileage second-hand: Good/Fair 6,000km, Poor 50,000km

### 6. Fraud Check (Creditsafe)
- Fraud score threshold: Excellent ≤30, Good ≤40, Fair ≤60, Poor ≤70
- Sanction list hit: Not allowed (Poor: manual review)
- Adverse media: Only allowed for Poor tier

### 7. Legal Status Check (Creditsafe)
- BV/SRL: All tiers
- NV/SA: All tiers
- VOF/SNC: All tiers
- CommV/SComm: All tiers
- CV/SC: Poor only
- VZW/ASBL: Poor only
- Eenmanszaak (Sole Proprietorship): Poor only

### 8. Blocklist Check (Internal)
- Blocklist hit: Rejected for all tiers (hard rejection)

## Rule Engine Logic

```
1. Run all rules against the enriched data
2. Each rule returns: { tier, passed, reason, actualValue, requiredValue }
3. Aggregate results:
   - If ANY rule returns REJECTED → Final tier is REJECTED
   - If ANY rule returns MANUAL_REVIEW → Final tier is MANUAL_REVIEW
   - Otherwise → Final tier is the LOWEST (worst) tier from all rules
4. Look up financial terms for the final tier
5. Return complete result with all rule evaluations
```

## Data Sources

| Source | Data Points | Cost |
|--------|-------------|------|
| **Questionnaire** | Contact info, legal history, insurance history, vehicle details, self-declared witholdingObligation | Free |
| **Creditsafe API** | Credit rating, company info, directors, bankruptcies, fraud score, legal form, sanctions | Paid |
| **VIES API (EU)** | VAT number validation, company name, address | Free |

## API Endpoint

```
POST /api/v1/credit-check

Request:
{
  questionnaire: {
    contact: { firstName, lastName, email, phone, dateOfBirth, ... },
    legalHistory: { contactWithLegalAuthorities, troubleWithPayment, ... },
    insuranceHistory: { accidentsAtFault, accidentsNotAtFault, ... },
    vehicle: { type, horsepower, value, mileage, ageYears },
    witholdingObligation: { selfDeclaredDebt, certificateUploaded }
  },
  company: {
    vatNumber: "BE0123456789",
    name: "Company Name",
    legalForm: "BV"
  }
}

Response:
{
  success: true,
  result: {
    tier: "good",
    requiresManualReview: false,
    financialTerms: {
      yearlyInterestPercent: 5.5,
      minDownpaymentPercent: 0,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 15,
      canFinanceRegistrationTax: true
    },
    ruleResults: [...],
    enrichedData: {...},
    flags: {...}
  }
}
```

## Technical Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Language**: TypeScript
- **External APIs**: Creditsafe, VIES (EU)

## Key Design Principles

1. **Single Source of Truth**: All tier thresholds defined in one configuration file
2. **Extensibility**: Easy to add new rules, modify thresholds, or add new tiers
3. **Transparency**: Every rule evaluation is logged and returned in the response
4. **Fail-Safe**: External API failures trigger manual review, never silent failures
5. **Worst-Case Aggregation**: Final tier is always the worst result across all rules