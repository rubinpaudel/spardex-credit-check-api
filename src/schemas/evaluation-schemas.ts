/**
 * Zod Validation Schemas
 * Comprehensive validation schemas for tier evaluation system
 */

import { z } from "zod";

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const questionnaireSchema = z.object({
  belgiumResidency: z.boolean({
    required_error: "Belgium residency status is required",
  }),
  age: z.number({
    required_error: "Age is required",
  }).int().min(18, "Minimum age is 18"),
  isAdmin: z.boolean({
    required_error: "Administrator status is required",
  }),
  legalIssues: z.boolean({
    required_error: "Legal issues status is required",
  }),
  paymentIssuesElsewhere: z.boolean({
    required_error: "Payment issues status is required",
  }),
  bankBlacklist: z.boolean({
    required_error: "Bank blacklist status is required",
  }),
});

export const companySchema = z.object({
  vatNumber: z.string({
    required_error: "VAT number is required",
  })
    .min(10, "VAT number must be at least 10 characters")
    .max(15, "VAT number must not exceed 15 characters")
    .regex(/^[A-Z]{2}[0-9A-Z]+$/, "VAT number must start with 2-letter country code followed by alphanumeric characters"),
  legalForm: z.string({
    required_error: "Legal form is required",
  }).min(2, "Legal form must be at least 2 characters"),
  yearsActive: z.number()
    .min(0, "Years active cannot be negative")
    .optional(),
});

export const administratorSchema = z.object({
  bankruptcies: z.number({
    required_error: "Bankruptcies count is required",
  })
    .int("Bankruptcies must be a whole number")
    .min(0, "Bankruptcies cannot be negative"),
  bankruptcyYearsScope: z.number({
    required_error: "Bankruptcy years scope is required",
  })
    .min(0, "Bankruptcy years scope cannot be negative"),
  trackRecordYears: z.number({
    required_error: "Track record years is required",
  })
    .min(0, "Track record years cannot be negative"),
});

export const assetSchema = z.object({
  isNew: z.boolean({
    required_error: "Vehicle new/used status is required",
  }),
  vehicleAge: z.number()
    .min(0, "Vehicle age cannot be negative")
    .optional(),
  value: z.number({
    required_error: "Vehicle value is required",
  })
    .min(0, "Vehicle value cannot be negative"),
  mileage: z.number()
    .int("Mileage must be a whole number")
    .min(0, "Mileage cannot be negative")
    .optional(),
  horsepower: z.number({
    required_error: "Vehicle horsepower is required",
  })
    .min(0, "Horsepower cannot be negative"),
}).refine(
  (data) => {
    // If vehicle is used (not new), vehicleAge and mileage are required
    if (!data.isNew) {
      return data.vehicleAge !== undefined && data.mileage !== undefined;
    }
    return true;
  },
  {
    message: "Vehicle age and mileage are required for second-hand vehicles",
    path: ["vehicleAge"],
  }
);

export const insuranceSchema = z.object({
  licenseSinceYears: z.number({
    required_error: "License years is required",
  })
    .min(0, "License years cannot be negative"),
  atFaultAccidents: z.number({
    required_error: "At-fault accidents count is required",
  })
    .int("At-fault accidents must be a whole number")
    .min(0, "At-fault accidents cannot be negative"),
  notAtFaultAccidents: z.number({
    required_error: "Not-at-fault accidents count is required",
  })
    .int("Not-at-fault accidents must be a whole number")
    .min(0, "Not-at-fault accidents cannot be negative"),
  accidentYearsScope: z.number({
    required_error: "Accident years scope is required",
  })
    .min(0, "Accident years scope cannot be negative"),
  driverAge: z.number({
    required_error: "Driver age is required",
  })
    .int("Driver age must be a whole number")
    .min(18, "Minimum driver age is 18"),
});

export const fraudSchema = z.object({
  score: z.number({
    required_error: "Fraud score is required",
  })
    .min(0, "Fraud score cannot be negative")
    .max(100, "Fraud score cannot exceed 100"),
  adverseMedia: z.boolean({
    required_error: "Adverse media status is required",
  }),
  sanctionList: z.boolean({
    required_error: "Sanction list status is required",
  }),
});

export const evaluationRequestSchema = z.object({
  questionnaire: questionnaireSchema,
  company: companySchema,
  administrator: administratorSchema,
  asset: assetSchema,
  insurance: insuranceSchema.optional(),
  fraud: fraudSchema.optional(),
});

// ============================================================================
// TYPE EXPORTS (inferred from schemas)
// ============================================================================

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type AdministratorInput = z.infer<typeof administratorSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
export type FraudInput = z.infer<typeof fraudSchema>;
export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;
