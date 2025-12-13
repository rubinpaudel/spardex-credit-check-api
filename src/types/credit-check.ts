import { z } from "zod";

/**
 * Belgian VAT number validation
 * Format: BE + 10 digits (dots and spaces are stripped before validation)
 * Examples: BE0123456789, BE0123.456.789, BE 0123 456 789
 */
const belgianVatNumber = z
  .string()
  .transform((val) => val.replace(/[\s.]/g, "").toUpperCase())
  .pipe(
    z.string().regex(/^BE[0-9]{10}$/, {
      message:
        "Invalid Belgian VAT number format. Expected: BE followed by 10 digits (e.g., BE0123456789)",
    })
  );

export const creditCheckRequestSchema = z.object({
  vat_number: belgianVatNumber,
});

export type CreditCheckRequest = z.infer<typeof creditCheckRequestSchema>;
