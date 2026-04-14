import { z } from 'zod';

export const TransactionInputSchema = z.object({
   id: z.string().min(1),
   amount: z.number().nonnegative(),
   currency: z.string().min(1),
   merchant: z.string().min(1),
   merchantCategory: z.string().min(1),
   location: z.string().min(1),
   accountAge: z.number().nonnegative(),
   avgMonthlySpend: z.number().nonnegative(),
   hourOfDay: z.number().int().min(0).max(23),
   dayOfWeek: z.string().min(1),
   previousFraudFlags: z.number().int().nonnegative(),
   distanceFromLastTransaction: z.number().nonnegative(),
   timeSinceLastTransaction: z.number().nonnegative(),
   isInternational: z.boolean(),
   cardPresent: z.boolean(),
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;
