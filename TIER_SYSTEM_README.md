# Tier Classification System - Implementation Guide

## Overview

This document describes the implementation of the vehicle financing tier classification system for Spardex. The system evaluates clients through a funnel-based approach, starting from the highest tier (EXCELLENT) and downgrading based on failed criteria until a final tier assignment or rejection.

## System Architecture

### Tech Stack
- **Runtime**: Bun
- **Framework**: Elysia (TypeScript-first web framework)
- **External APIs**:
  - Creditsafe API (company credit data)
  - VIES API (VAT validation)
- **Configuration**: JSON-based (no database required for MVP)
- **Logging**: Pino logger + JSON file-based evaluation logs

### Project Structure

```
src/
├── config/
│   ├── tier-rules.json          # Complete tier criteria configuration
│   ├── creditsafe-config.ts     # Creditsafe API settings
│   └── vies-config.ts           # VIES API settings
│
├── types/
│   ├── tier-types.ts            # Tier enums and interest rates
│   ├── input-types.ts           # Request payload structures
│   ├── evaluation-result-types.ts  # Response structures
│   └── criteria-types.ts        # Tier criteria definitions
│
├── services/
│   ├── integrations/
│   │   ├── creditsafe-service.ts  # Creditsafe API integration
│   │   └── vies-service.ts        # VIES VAT validation
│   │
│   └── tier-engine/
│       ├── tier-evaluator.ts      # Main evaluation engine
│       └── evaluation-logger.ts   # JSON-based logging
│
├── validators/
│   ├── questionnaire-validator.ts
│   ├── company-validator.ts
│   ├── admin-validator.ts
│   ├── asset-validator.ts
│   ├── insurance-validator.ts
│   ├── legal-status-validator.ts
│   └── fraud-validator.ts
│
├── utils/
│   └── error-handler.ts
│
├── routes/
│   └── evaluation-routes.ts      # API route definitions (reference)
│
└── index.ts                       # Main application entry point
```

## Tier Hierarchy

1. **EXCELLENT** - 3% interest rate
2. **GOOD** - 5.5% interest rate
3. **FAIR** - 12% interest rate
4. **POOR** - 22% interest rate
5. **MANUAL_REVIEW** - Requires human intervention
6. **REJECTED** - Application denied

## API Endpoints

### 1. Evaluate Tier Classification

**Endpoint**: `POST /api/tiers/evaluate`

**Authentication**: API key required in `x-api-key` header

**Request Body**:
```json
{
  "questionnaire": {
    "belgiumResidency": true,
    "age": 30,
    "isAdmin": true,
    "legalIssues": false,
    "paymentIssuesElsewhere": false,
    "bankBlacklist": false
  },
  "company": {
    "vatNumber": "BE0123456789",
    "legalForm": "BV",
    "yearsActive": 5
  },
  "administrator": {
    "bankruptcies": 0,
    "bankruptcyYearsScope": 10,
    "trackRecordYears": 5
  },
  "asset": {
    "isNew": true,
    "value": 25000,
    "horsepower": 120
  },
  "insurance": {
    "licenseSinceYears": 10,
    "atFaultAccidents": 0,
    "notAtFaultAccidents": 1,
    "accidentYearsScope": 2,
    "driverAge": 30
  },
  "fraud": {
    "score": 20,
    "adverseMedia": false,
    "sanctionList": false
  }
}
```

**Success Response** (200 OK):
```json
{
  "tier": "EXCELLENT",
  "reasoning": [
    "Fetching external data from Creditsafe and VIES...",
    "✓ Creditsafe data fetched successfully",
    "✓ VIES validation: Valid",
    "Checking for manual review triggers...",
    "Starting funnel evaluation from EXCELLENT tier...",
    "\nEvaluating EXCELLENT tier criteria...",
    "  - Checking questionnaire...",
    "    ✓ Passed",
    "  - Checking company criteria...",
    "    ✓ Passed",
    "  - Checking administrator criteria...",
    "    ✓ Passed",
    "  - Checking asset criteria...",
    "    ✓ Passed",
    "  - Checking legal status...",
    "    ✓ Passed",
    "  - Checking fraud criteria...",
    "    ✓ Passed",
    "\n✓ All criteria passed for EXCELLENT tier!"
  ],
  "failedCriteria": [],
  "timestamp": "2025-12-08T18:00:00.000Z",
  "externalData": {
    "creditsafe": {
      "creditRating": 95,
      "yearsActive": 5.2,
      "financialDisclosure": true,
      "companyActive": true,
      "inhoudingsplichtHit": false,
      "success": true
    },
    "vies": {
      "valid": true,
      "name": "Example Company BVBA",
      "address": "Example Street 123, 1000 Brussels, Belgium",
      "countryCode": "BE",
      "vatNumber": "0123456789",
      "requestDate": "2025-12-08T18:00:00.000Z",
      "success": true
    }
  },
  "interestRate": 3
}
```

**Manual Review Response**:
```json
{
  "tier": "MANUAL_REVIEW",
  "reasoning": [...],
  "failedCriteria": [],
  "manualReviewReasons": [
    "Legal authority contact requires manual review",
    "Payment issues at other financiers require manual review"
  ],
  "timestamp": "2025-12-08T18:00:00.000Z",
  "externalData": {...},
  "interestRate": null
}
```

**Rejection Response**:
```json
{
  "tier": "REJECTED",
  "reasoning": [...],
  "failedCriteria": [
    {
      "category": "questionnaire",
      "criterion": "belgiumResidency",
      "actualValue": false,
      "requiredValue": true,
      "message": "Applicant must be a Belgium resident"
    }
  ],
  "timestamp": "2025-12-08T18:00:00.000Z",
  "externalData": {...},
  "interestRate": null
}
```

**Error Response** (500):
```json
{
  "error": "EXTERNAL_SERVICE_FAILURE",
  "message": "Failed to fetch company data: Creditsafe API timeout",
  "context": {
    "service": "Creditsafe",
    "details": "..."
  },
  "timestamp": "2025-12-08T18:00:00.000Z"
}
```

### 2. Get Tier Configuration

**Endpoint**: `GET /api/tiers/config`

**Authentication**: API key required

**Response**: Returns the complete tier rules configuration from [tier-rules.json](src/config/tier-rules.json)

## Evaluation Logic (Funnel Approach)

### Step 1: Fetch External Data
- Call Creditsafe API to get company credit rating, years active, financial disclosure, etc.
- Call VIES API to validate VAT number
- If either API fails, return error with context

### Step 2: Check Manual Review Triggers
- Legal issues (depends on tier config)
- Payment issues at other financiers (depends on tier config)
- Bank blacklist status (depends on tier config)

If triggers exist and NO tier allows them as "MANUAL", then REJECT.
If triggers exist and any tier allows "MANUAL", continue but mark for potential manual review.

### Step 3: Funnel Evaluation
Start from EXCELLENT tier and evaluate criteria:

```
for each tier in [EXCELLENT, GOOD, FAIR, POOR]:
  for each enabled category:
    validate category criteria
    if ANY criterion fails:
      demote to next tier
      continue to next tier

  if ALL criteria pass:
    if manual review reasons exist:
      return MANUAL_REVIEW
    else:
      return current tier
```

### Step 4: Final Result
- If passed any tier → return that tier (or MANUAL_REVIEW if flagged)
- If failed all tiers → return REJECTED (or MANUAL_REVIEW if flagged)

## Configuration

### Environment Variables

Required variables (set in `.env`):

```bash
# Server
PORT=3000
NODE_ENV=development

# Security
API_KEY=your-secret-api-key-here
CORS_ORIGIN=http://localhost:5173

# Creditsafe API
CREDITSAFE_API_URL=https://connect.creditsafe.com/v1
CREDITSAFE_USERNAME=your-username
CREDITSAFE_PASSWORD=your-password
```

### Tier Rules Configuration

Edit [src/config/tier-rules.json](src/config/tier-rules.json) to customize tier criteria.

**Example structure**:
```json
{
  "tiers": [
    {
      "tier": "EXCELLENT",
      "enabled": {
        "questionnaire": true,
        "company": true,
        "admin": true,
        "asset": true,
        "insurance": false,
        "legalStatus": true,
        "fraud": true
      },
      "questionnaire": {
        "belgiumResidency": true,
        "minAge": 18,
        "isAdmin": true,
        "legalIssues": "NO_GO",
        "paymentIssuesElsewhere": "NO_GO",
        "bankBlacklist": "NO_GO"
      },
      "company": {
        "creditRatingThreshold": 90,
        "minCompanyYears": 5,
        "financialDisclosureRequired": true,
        "companyActive": true,
        "inhoudingsplichtHit": "NOT_ALLOWED",
        "vatNumberValid": "REQUIRED"
      },
      ...
    }
  ]
}
```

## Evaluation Logging

All evaluations are automatically logged to `logs/evaluations.json`:

```json
{
  "evaluations": [
    {
      "timestamp": "2025-12-08T18:00:00.000Z",
      "request": {...},
      "result": {...}
    }
  ]
}
```

Log file keeps last 1000 evaluations automatically.

## Testing

### Start the Server

```bash
# Development mode (with auto-reload)
bun run dev

# Production mode
bun run build
bun run start
```

### Test with cURL

```bash
# Set your API key
API_KEY="your-secret-api-key-here"

# Test EXCELLENT tier
curl -X POST http://localhost:3000/api/tiers/evaluate \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "questionnaire": {
      "belgiumResidency": true,
      "age": 30,
      "isAdmin": true,
      "legalIssues": false,
      "paymentIssuesElsewhere": false,
      "bankBlacklist": false
    },
    "company": {
      "vatNumber": "BE0123456789",
      "legalForm": "BV"
    },
    "administrator": {
      "bankruptcies": 0,
      "bankruptcyYearsScope": 10,
      "trackRecordYears": 5
    },
    "asset": {
      "isNew": true,
      "value": 25000,
      "horsepower": 120
    },
    "fraud": {
      "score": 20,
      "adverseMedia": false,
      "sanctionList": false
    }
  }'

# Get tier configuration
curl http://localhost:3000/api/tiers/config \
  -H "x-api-key: $API_KEY"
```

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3000/swagger
```

## External API Integration

### Creditsafe

The system uses the Creditsafe Connect API v1:
- Authentication: Username/password → Bearer token (cached for 55 minutes)
- Company search by VAT number
- Fetch full company report with credit rating, years active, etc.

**Mock Mode**: If credentials are not configured, you can use `getMockCompanyData()` from [creditsafe-service.ts](src/services/integrations/creditsafe-service.ts)

### VIES (VAT Information Exchange System)

EU official VAT validation system:
- REST API (primary)
- SOAP API (fallback)
- Validates Belgian VAT numbers (format: BE0123456789)

**Mock Mode**: If VIES is unavailable, you can use `getMockVatValidation()` from [vies-service.ts](src/services/integrations/vies-service.ts)

## Error Handling

The system provides detailed error responses with context:

1. **Validation Errors** (400) - Invalid request format
2. **External Service Failures** (500) - Creditsafe/VIES API errors
3. **Generic API Errors** (500) - Unexpected errors

All errors include:
- `error`: Error type
- `message`: Human-readable description
- `context`: Additional details (service name, error details)
- `timestamp`: ISO 8601 timestamp

## Deployment

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure all required environment variables
3. Add Creditsafe credentials
4. Set production API key

### Build and Run

```bash
# Install dependencies
bun install

# Build for production
bun run build

# Start production server
NODE_ENV=production bun run start
```

### Railway/Vercel Deployment

The application is ready for deployment on platforms like Railway or Vercel:
- Automatic `PORT` detection
- Environment variables via platform UI
- Health check endpoint: `GET /health`

## Future Enhancements

Potential improvements for future iterations:

1. **Database Integration**: Replace JSON logs with PostgreSQL/MongoDB
2. **Blocklist Management**: API endpoints to manage company blocklists
3. **Historical Tracking**: Track tier changes over time per company
4. **Admin Dashboard**: Web UI for managing configurations
5. **Webhook Notifications**: Notify external systems of evaluations
6. **Rate Limiting**: Protect APIs from abuse
7. **Caching**: Redis cache for frequently evaluated companies
8. **Batch Processing**: Evaluate multiple applications at once

## Support

For issues or questions:
- Check logs in `logs/evaluations.json`
- Review Swagger docs at `/swagger`
- Verify environment variables are set correctly
- Check Creditsafe/VIES API connectivity
