/**
 * Evaluation Routes
 * API endpoints for tier evaluation
 */

import { Elysia, t } from "elysia";
import { evaluateTier } from "../services/tier-engine/tier-evaluator";
import { logEvaluation } from "../services/tier-engine/evaluation-logger";
import type { EvaluationRequest } from "../types/input-types";
import {
  toEvaluationError,
  createValidationError,
} from "../utils/error-handler";

// Request validation schema
const questionnaireSchema = t.Object({
  belgiumResidency: t.Boolean(),
  age: t.Number({ minimum: 18 }),
  isAdmin: t.Boolean(),
  legalIssues: t.Boolean(),
  paymentIssuesElsewhere: t.Boolean(),
  bankBlacklist: t.Boolean(),
});

const companySchema = t.Object({
  vatNumber: t.String({ minLength: 10, maxLength: 15 }),
  legalForm: t.String({ minLength: 2 }),
  yearsActive: t.Optional(t.Number({ minimum: 0 })),
});

const administratorSchema = t.Object({
  bankruptcies: t.Number({ minimum: 0 }),
  bankruptcyYearsScope: t.Number({ minimum: 0 }),
  trackRecordYears: t.Number({ minimum: 0 }),
});

const assetSchema = t.Object({
  isNew: t.Boolean(),
  vehicleAge: t.Optional(t.Number({ minimum: 0 })),
  value: t.Number({ minimum: 0 }),
  mileage: t.Optional(t.Number({ minimum: 0 })),
  horsepower: t.Number({ minimum: 0 }),
});

const insuranceSchema = t.Object({
  licenseSinceYears: t.Number({ minimum: 0 }),
  atFaultAccidents: t.Number({ minimum: 0 }),
  notAtFaultAccidents: t.Number({ minimum: 0 }),
  accidentYearsScope: t.Number({ minimum: 0 }),
  driverAge: t.Number({ minimum: 18 }),
});

const fraudSchema = t.Object({
  score: t.Number({ minimum: 0, maximum: 100 }),
  adverseMedia: t.Boolean(),
  sanctionList: t.Boolean(),
});

const evaluationRequestSchema = t.Object({
  questionnaire: questionnaireSchema,
  company: companySchema,
  administrator: administratorSchema,
  asset: assetSchema,
  insurance: t.Optional(insuranceSchema),
  fraud: t.Optional(fraudSchema),
});

/**
 * Setup evaluation routes
 */
export function setupEvaluationRoutes(app: Elysia) {
  return app.group("/api/tiers", (app) =>
    app
      .post(
        "/evaluate",
        async ({ body, set }) => {
          try {
            // Validate request body
            const request = body as EvaluationRequest;

            // Additional validation: second-hand vehicles must have age and mileage
            if (!request.asset.isNew) {
              if (
                request.asset.vehicleAge === undefined ||
                request.asset.mileage === undefined
              ) {
                set.status = 400;
                return createValidationError(
                  "Second-hand vehicles must include vehicleAge and mileage",
                  {
                    missingFields: [
                      !request.asset.vehicleAge ? "vehicleAge" : null,
                      !request.asset.mileage ? "mileage" : null,
                    ].filter(Boolean),
                  }
                );
              }
            }

            // Perform tier evaluation
            const result = await evaluateTier(request);

            // Log the evaluation
            await logEvaluation(request, result);

            return result;
          } catch (error) {
            console.error("Evaluation error:", error);
            set.status = 500;
            return toEvaluationError(error);
          }
        },
        {
          body: evaluationRequestSchema,
          detail: {
            tags: ["Tier Evaluation"],
            summary: "Evaluate tier classification",
            description:
              "Evaluates a vehicle financing application and returns the assigned tier based on funnel-based criteria. Integrates with Creditsafe and VIES APIs to fetch company and VAT validation data.",
          },
        }
      )
      .get(
        "/config",
        async () => {
          const tierRules = await import("../config/tier-rules.json");
          return tierRules.default;
        },
        {
          detail: {
            tags: ["Tier Evaluation"],
            summary: "Get tier configuration",
            description:
              "Returns the current tier rules configuration including criteria for each tier level.",
          },
        }
      )
  );
}
