# Claude.md - Credit Check Service Context

> This file provides context for AI assistants working on this codebase.

## What This Application Does

This is an **automated credit check service** for Belgian companies applying for vehicle leasing. It evaluates applicants through a questionnaire + external APIs and returns a **tier classification** with financing terms.

```
Input: Questionnaire + VAT Number
                ↓
        Data Enrichment (Creditsafe, VIES)
                ↓
        Rule Engine (evaluate all rules)
                ↓
Output: Tier + Financial Terms + Rule Results
```

---

## The Tier System

### Tier Hierarchy (worst → best)

```typescript
enum Tier {
  REJECTED = 0,       // Hard rejection, cannot proceed
  MANUAL_REVIEW = 1,  // Needs human review
  POOR = 2,           // High risk, strict terms
  FAIR = 3,           // Moderate risk
  GOOD = 4,           // Low risk
  EXCELLENT = 5       // Lowest risk, best terms
}
```

### Tier Comparison

Always use numeric comparison. Lower number = worse tier.

```typescript
// Helper function
function isWorseTier(a: Tier, b: Tier): boolean {
  return a < b;
}

// Example: POOR (2) is worse than GOOD (4)
isWorseTier(Tier.POOR, Tier.GOOD) // true
```

### Financial Terms Per Tier

| Tier | Interest | Downpayment | Max Period | Residual | Reg. Tax |
|------|----------|-------------|------------|----------|----------|
| EXCELLENT | 3% | 0% | 60 months | 15% | Yes |
| GOOD | 5.5% | 0% | 60 months | 15% | Yes |
| FAIR | 12% | 10% | 60 months | 15% | No |
| POOR | 22% | 20% | 60 months | 5% | No |

---

## Rule System Architecture

### Core Concept

The system uses a **worst-case aggregation** model:

1. Every rule evaluates the data and returns the **best tier the applicant qualifies for**
2. The final tier is the **worst (lowest) tier** across all rule results
3. Special cases: `REJECTED` and `MANUAL_REVIEW` take precedence

### Rule Interface

```typescript
interface Rule {
  id: string;                    // Unique identifier, e.g., "credit-rating"
  category: RuleCategory;        // e.g., "company", "admin", "fraud"
  
  evaluate(
    data: EnrichedData, 
    config: TierConfig
  ): RuleResult;
}

interface RuleResult {
  ruleId: string;
  category: RuleCategory;
  tier: Tier;                    // The tier this rule maps to
  passed: boolean;               // Did applicant meet minimum requirements?
  reason: string;                // Human-readable explanation
  actualValue: any;              // What we found
  expectedValue: any;            // What was required (for the returned tier)
}
```

### Rule Categories

```typescript
enum RuleCategory {
  BLOCKLIST = "blocklist",           // Hard rejections
  GENERAL = "general",               // Basic requirements
  COMPANY = "company",               // Company data checks
  ADMIN = "admin",                   // Administrator checks
  LEGAL_STATUS = "legal_status",     // Legal form validation
  FRAUD = "fraud",                   // Fraud indicators
  ASSET = "asset",                   // Vehicle constraints
  INSURANCE = "insurance"            // Insurance requirements (Poor only)
}
```

---

## Rule Types & Patterns

### 1. Threshold Rules (most common)

Compare a numeric value against tier thresholds. Return the best tier the value qualifies for.

```typescript
// Example: Credit Rating Rule
function evaluateCreditRating(creditRating: number, config: TierConfig): Tier {
  if (creditRating >= config.excellent.creditRatingMin) return Tier.EXCELLENT;
  if (creditRating >= config.good.creditRatingMin) return Tier.GOOD;
  if (creditRating >= config.fair.creditRatingMin) return Tier.FAIR;
  if (creditRating >= config.poor.creditRatingMin) return Tier.POOR;
  return Tier.REJECTED;
}

// Thresholds from config:
// excellent: 90, good: 70, fair: 50, poor: 30
// 
// Examples:
// creditRating = 95 → EXCELLENT
// creditRating = 75 → GOOD
// creditRating = 45 → FAIR (doesn't meet 50)
// creditRating = 25 → REJECTED (below 30)
```

### 2. Boolean Rules

Check if a condition is allowed for each tier.

```typescript
// Example: WitholdingObligation Rule
function evaluateWitholdingObligation(hasHit: boolean, config: TierConfig): Tier {
  if (!hasHit) {
    return Tier.EXCELLENT; // No hit = qualifies for best tier
  }
  
  // Has hit - check which tiers allow it
  if (config.poor.witholdingObligationAllowed) return Tier.POOR;
  return Tier.REJECTED;
}

// Config: Only Poor tier allows witholdingObligation hit
// hasHit = false → EXCELLENT
// hasHit = true → POOR
```

### 3. Allowed Values Rules

Check if a value is in an allowed list per tier.

```typescript
// Example: Legal Form Rule
function evaluateLegalForm(legalForm: string, config: TierConfig): Tier {
  if (config.excellent.allowedLegalForms.includes(legalForm)) return Tier.EXCELLENT;
  if (config.good.allowedLegalForms.includes(legalForm)) return Tier.GOOD;
  if (config.fair.allowedLegalForms.includes(legalForm)) return Tier.FAIR;
  if (config.poor.allowedLegalForms.includes(legalForm)) return Tier.POOR;
  return Tier.REJECTED;
}

// Allowed forms:
// excellent/good/fair: ["BV", "NV", "VOF", "CommV"]
// poor: ["BV", "NV", "VOF", "CommV", "CV", "VZW", "Eenmanszaak"]
//
// legalForm = "BV" → EXCELLENT
// legalForm = "VZW" → POOR
// legalForm = "Unknown" → REJECTED
```

### 4. Hard Rejection Rules

Immediately return REJECTED regardless of other factors.

```typescript
// Example: Blocklist Rule
function evaluateBlocklist(isBlocked: boolean): Tier {
  if (isBlocked) return Tier.REJECTED;
  return Tier.EXCELLENT; // No block = doesn't restrict tier
}
```

### 5. Manual Review Rules

Some conditions trigger manual review instead of rejection.

```typescript
// Example: Sanction List Rule
function evaluateSanctionList(hasHit: boolean, config: TierConfig): Tier {
  if (!hasHit) return Tier.EXCELLENT;
  
  // Poor tier allows with manual review
  if (config.poor.sanctionListAllowed === "manualReview") {
    return Tier.MANUAL_REVIEW;
  }
  return Tier.REJECTED;
}
```

### 6. Conditional Rules

Some rules only apply under certain conditions.

```typescript
// Example: Insurance rules only apply to Poor tier
function evaluateInsuranceRules(data: EnrichedData, currentWorstTier: Tier): RuleResult[] {
  // Only evaluate if we're already at Poor tier
  if (currentWorstTier !== Tier.POOR) {
    return []; // Skip these rules
  }
  
  // Now evaluate insurance-specific rules
  return [
    evaluateDriverAge(data),
    evaluateAccidents(data),
    evaluateHorsepower(data),
    // ...
  ];
}
```

---

## Rule Aggregation Logic

```typescript
function aggregateResults(results: RuleResult[]): AggregatedResult {
  // 1. Check for hard rejections first
  const rejected = results.find(r => r.tier === Tier.REJECTED);
  if (rejected) {
    return {
      finalTier: Tier.REJECTED,
      reason: rejected.reason,
      allResults: results
    };
  }
  
  // 2. Check for manual review
  const manualReview = results.find(r => r.tier === Tier.MANUAL_REVIEW);
  if (manualReview) {
    return {
      finalTier: Tier.MANUAL_REVIEW,
      reason: manualReview.reason,
      allResults: results
    };
  }
  
  // 3. Get worst (lowest) tier from all results
  const worstTier = results.reduce(
    (worst, result) => result.tier < worst ? result.tier : worst,
    Tier.EXCELLENT
  );
  
  return {
    finalTier: worstTier,
    reason: `Qualified for ${tierName(worstTier)} based on ${results.length} rules`,
    allResults: results
  };
}
```

---

## Tier Configuration Structure

The tier config is the **single source of truth** for all thresholds.

```typescript
// src/config/tier-config.ts

export const tierConfig: TierConfig = {
  excellent: {
    // Company checks
    creditRatingMin: 90,
    minCompanyYears: 5,
    requiresFinancialDisclosure: true,
    
    // Admin checks
    maxAdminBankruptcies: 0,
    bankruptcyScopeYears: 10,
    minAdminTrackRecordYears: 3,
    
    // Fraud checks
    fraudScoreMax: 30,
    sanctionListAllowed: false,
    adverseMediaAllowed: false,
    
    // Legal status
    allowedLegalForms: ["BV", "NV", "VOF", "CommV"],
    
    // Asset checks
    allowsSecondHand: false,
    minVehicleValue: 10000,
    
    // Flags
    witholdingObligationAllowed: false,
    
    // Financial terms
    financialTerms: {
      yearlyInterestPercent: 3,
      minDownpaymentPercent: 0,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 15,
      canFinanceRegistrationTax: true
    }
  },
  
  good: { /* ... */ },
  fair: { /* ... */ },
  poor: {
    // Poor has the loosest requirements
    creditRatingMin: 30,
    minCompanyYears: 1,
    maxAdminBankruptcies: 3,
    
    // Poor-specific: insurance checks apply
    insuranceChecks: {
      minDriverAge: 25,
      minLicenseYears: 5,
      maxAccidentsAtFault: 3,
      maxAccidentsNotAtFault: 5,
      maxVehicleHorsepower: 150
    },
    
    // Asset checks are stricter for Poor
    minVehicleValue: 20000,  // Higher than other tiers!
    maxSecondHandMileage: 50000,
    maxSecondHandAge: 3,
    
    // ...
  }
};
```

---

## Data Flow

### 1. Request comes in

```typescript
interface CreditCheckRequest {
  company: {
    vatNumber: string;      // "BE0123456789"
    name: string;
    legalForm: string;      // "BV", "NV", etc.
  };
  questionnaire: {
    contact: ContactInfo;
    legalHistory: LegalHistory;
    insuranceHistory: InsuranceHistory;
    vehicle: VehicleInfo;
    witholdingObligation: WitholdingObligationInfo;
  };
}
```

### 2. Data Enrichment

```typescript
// Parallel API calls
const [creditsafeData, viesData] = await Promise.all([
  creditsafeClient.getCompanyReport(vatNumber),
  viesClient.validateVat(vatNumber)
]);

// Combine into enriched data
const enrichedData: EnrichedData = {
  questionnaire: request.questionnaire,
  creditsafe: creditsafeData,
  vies: viesData,
  calculated: {
    companyAgeYears: calculateYears(creditsafeData.incorporationDate),
    contactAge: calculateAge(questionnaire.contact.dateOfBirth),
    adminBankruptciesInScope: countBankruptciesInScope(creditsafeData.directors)
  }
};
```

### 3. Rule Evaluation

```typescript
// Get all registered rules
const rules = ruleRegistry.getAllRules();

// Evaluate each rule
const results = rules.map(rule => 
  rule.evaluate(enrichedData, tierConfig)
);

// Aggregate to final tier
const { finalTier, allResults } = aggregateResults(results);
```

### 4. Response

```typescript
const response: CreditCheckResponse = {
  success: true,
  result: {
    tier: finalTier,
    requiresManualReview: finalTier === Tier.MANUAL_REVIEW,
    financialTerms: getFinancialTerms(finalTier),
    ruleResults: allResults,
    enrichedData: enrichedData,
    flags: {
      sanctionListHit: enrichedData.creditsafe.sanctionListHit,
      witholdingObligationHit: enrichedData.questionnaire.witholdingObligation.selfDeclaredDebt,
      // ...
    }
  },
  requestId: generateUUID(),
  timestamp: new Date().toISOString()
};
```

---

## Key Business Rules

### Hard Rejections (any tier)
- Blocklist hit
- Company not active
- Contact under 18 years old
- Contact not Belgium resident
- Contact not administrator of company
- Credit rating below 30

### Manual Review Triggers
- VIES validation failed
- Sanction list hit (for Poor tier applicants)
- Payment trouble at other financing company
- Contact with legal authorities
- Invalid VAT (for Poor tier applicants)

### Tier Restrictions

| Condition | Excellent | Good | Fair | Poor |
|-----------|:---------:|:----:|:----:|:----:|
| Second-hand vehicles | ❌ | ✅ | ✅ | ✅ |
| Sole proprietorship | ❌ | ❌ | ❌ | ✅ |
| VZW/ASBL | ❌ | ❌ | ❌ | ✅ |
| CV/SC | ❌ | ❌ | ❌ | ✅ |
| WitholdingObligation hit | ❌ | ❌ | ❌ | ✅ |
| Adverse media | ❌ | ❌ | ❌ | ✅ |
| Financial disclosure required | ✅ | ✅ | ❌ | ❌ |

### Insurance Rules (Poor tier only)

When an applicant lands in Poor tier, additional insurance checks apply:
- Driver must be ≥25 years old
- Driver's license ≥5 years
- Max 3 at-fault accidents (last 2 years)
- Max 5 not-at-fault accidents (last 2 years)
- Vehicle max 150 HP

If any of these fail → REJECTED (not Poor)

---

## File Structure

```
src/
├── index.ts                      # Elysia app entry point
├── config/
│   ├── tier-config.ts            # 👈 Single source of truth for tiers
│   └── environment.ts            # Env vars
├── types/
│   ├── tiers.ts                  # Tier enum and types
│   ├── request.ts                # Request DTOs
│   ├── response.ts               # Response DTOs
│   ├── enriched-data.ts          # Internal data structure
│   └── rules.ts                  # Rule interfaces
├── services/
│   ├── creditsafe/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── mapper.ts
│   ├── vies/
│   │   ├── client.ts
│   │   └── types.ts
│   └── data-enrichment.ts        # Orchestrates API calls
├── rules/
│   ├── engine.ts                 # evaluateAllRules, aggregateResults
│   ├── registry.ts               # Registers all rules
│   └── categories/
│       ├── blocklist.ts          # Hard rejections
│       ├── general.ts            # Basic requirements
│       ├── company.ts            # Credit, age, status
│       ├── admin.ts              # Bankruptcies
│       ├── legal-status.ts       # Legal forms
│       ├── fraud.ts              # Fraud score, sanctions
│       ├── asset.ts              # Vehicle checks
│       └── insurance.ts          # Poor tier only
├── routes/
│   └── credit-check.ts           # POST /api/v1/credit-check
└── utils/
    ├── response-builder.ts
    └── logger.ts
```

---

## Common Patterns

### Adding a New Rule

```typescript
// 1. Create the rule in appropriate category file
// src/rules/categories/company.ts

export const newCompanyRule: Rule = {
  id: "new-company-rule",
  category: RuleCategory.COMPANY,
  
  evaluate(data: EnrichedData, config: TierConfig): RuleResult {
    const value = data.creditsafe.someValue;
    
    // Determine tier based on thresholds
    let tier: Tier;
    if (value >= config.excellent.threshold) tier = Tier.EXCELLENT;
    else if (value >= config.good.threshold) tier = Tier.GOOD;
    // ... etc
    
    return {
      ruleId: this.id,
      category: this.category,
      tier,
      passed: tier !== Tier.REJECTED,
      reason: `Value ${value} qualifies for ${tier}`,
      actualValue: value,
      expectedValue: config[tier].threshold
    };
  }
};

// 2. Register in registry
// src/rules/registry.ts
import { newCompanyRule } from "./categories/company";

export const allRules: Rule[] = [
  // ... existing rules
  newCompanyRule,
];
```

### Modifying Tier Thresholds

Only change `src/config/tier-config.ts`. Rules read from config dynamically.

```typescript
// To change credit rating threshold for Good tier:
good: {
  creditRatingMin: 75, // Was 70, now 75
  // ...
}
```

---

## Testing

### Test Users

There are 10 predefined test users in `test_users_corrected.json`:

| ID | Expected Tier | Key Characteristics |
|----|---------------|---------------------|
| TEST_USER_001 | EXCELLENT | Credit 95, 10yr company, 0 bankruptcies |
| TEST_USER_002 | EXCELLENT | NV, credit 92, 27yr company |
| TEST_USER_003 | GOOD | Credit 78, 1 bankruptcy |
| TEST_USER_004 | GOOD | VOF, second-hand vehicle within limits |
| TEST_USER_005 | FAIR | Credit 55, 2 bankruptcies |
| TEST_USER_006 | FAIR | CommV, higher fraud score |
| TEST_USER_007 | POOR | Sole proprietorship, 3 bankruptcies |
| TEST_USER_008 | POOR | VZW, payment trouble |
| TEST_USER_009 | REJECTED | Inactive, blocklist, 4 bankruptcies |
| TEST_USER_010 | REJECTED | Non-resident, under 18 |

### Integration Test Pattern

```typescript
testUsers.forEach(user => {
  it(`returns ${user.expectedTier} for ${user.id}`, async () => {
    // Mock external APIs
    mockCreditsafe(user.mockCreditsafeResponse);
    mockVies(user.mockViesResponse);
    
    // Call endpoint
    const response = await app.handle(createRequest(user));
    const result = await response.json();
    
    // Assert tier
    expect(result.result.tier).toBe(user.expectedTier);
  });
});
```

---

## Gotchas & Edge Cases

1. **Second-hand vehicles for Excellent tier**: Always rejected, even if all other criteria are excellent.

2. **Insurance rules only for Poor**: Don't evaluate insurance rules unless the applicant is already mapped to Poor tier by other rules.

3. **Poor tier has HIGHER vehicle value minimum**: €20,000 vs €10,000 for other tiers. This is counterintuitive but intentional.

4. **Bankruptcy scope differs by tier**: A bankruptcy from 8 years ago counts for Excellent (10yr scope) but not for Poor (3yr scope).

5. **VIES failure ≠ rejection**: If VIES API fails, trigger manual review, don't reject.

6. **WitholdingObligation is self-declared**: We don't have API access, so we rely on questionnaire. Consider manual review if uncertain.

7. **Multiple directors**: If company has multiple directors, check bankruptcies for ALL of them, not just the contact person.

---

## External APIs

### Creditsafe
- **Auth**: JWT token (username/password)
- **Rate limit**: Check your contract
- **Sandbox**: `https://connect.sandbox.creditsafe.com/v1`
- **Production**: `https://connect.creditsafe.com/v1`

### VIES (EU VAT)
- **Auth**: None required
- **Rate limit**: Unofficial, be reasonable
- **Endpoint**: `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country}/vat/{number}`
- **Free**: Yes, public EU service