import { t } from "elysia";

export const creditCheckSchema = t.Object({
  company: t.Object({
    vatNumber: t.String({ minLength: 12, maxLength: 12 }), // "BE" + 10 digits
    name: t.String({ minLength: 1 }),
    legalForm: t.String({ minLength: 1 }),
  }),
  questionnaire: t.Object({
    contact: t.Object({
      firstName: t.String({ minLength: 1 }),
      lastName: t.String({ minLength: 1 }),
      email: t.String({ format: "email" }),
      phone: t.String({ minLength: 1 }),
      dateOfBirth: t.String(), // ISO date
      nationality: t.String({ minLength: 2, maxLength: 2 }),
      belgiumResident: t.Boolean(),
      isAdministrator: t.Boolean(),
      driversLicenseSinceYears: t.Number({ minimum: 0 }),
      adminTrackRecordYearsBelgium: t.Number({ minimum: 0 }),
    }),
    legalHistory: t.Object({
      contactWithLegalAuthorities: t.Boolean(),
      troubleWithPaymentAtFinancingCompany: t.Boolean(),
      blacklistedBanks: t.Array(t.String()),
    }),
    insuranceHistory: t.Object({
      driverAge: t.Number({ minimum: 0 }),
      licenseYears: t.Number({ minimum: 0 }),
      accidentsAtFault: t.Number({ minimum: 0 }),
      accidentsNotAtFault: t.Number({ minimum: 0 }),
      accidentScopeYears: t.Number({ minimum: 0 }),
    }),
    vehicle: t.Object({
      type: t.Union([t.Literal("new"), t.Literal("secondHand")]),
      horsepower: t.Number({ minimum: 1 }),
      value: t.Number({ minimum: 1 }),
      mileage: t.Number({ minimum: 0 }),
      ageYears: t.Number({ minimum: 0 }),
    }),
    withholdingObligation: t.Object({
      selfDeclaredDebt: t.Boolean(),
    }),
    // TEMPORARY: Mock data until Creditsafe integration
    _mock: t.Optional(
      t.Object({
        creditRating: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        fraudScore: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        companyAgeYears: t.Optional(t.Number({ minimum: 0 })),
        adminBankruptcies: t.Optional(t.Number({ minimum: 0 })),
        sanctionListHit: t.Optional(t.Boolean()),
        blocklistHit: t.Optional(t.Boolean()),
      })
    ),
  }),
});
