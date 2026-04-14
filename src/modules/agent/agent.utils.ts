import { TransactionInput } from './agent.schemas';

export type InvestigatorResult = {
   transactionId: string;
   suspicionScore: number;
   redFlags: string[];
};

const clampScore = (score: number) => Math.max(0, Math.min(100, score));

export function runInvestigator(transaction: TransactionInput): InvestigatorResult {
   const redFlags: string[] = [];
   let score = 0;

   if (transaction.avgMonthlySpend > 0) {
      const ratio = transaction.amount / transaction.avgMonthlySpend;
      if (ratio >= 20) {
         score += 35;
         redFlags.push(
            `Amount is ${Math.round(ratio)}x higher than account average`
         );
      } else if (ratio >= 10) {
         score += 20;
         redFlags.push(
            `Amount is ${Math.round(ratio)}x higher than account average`
         );
      } else if (ratio >= 5) {
         score += 10;
         redFlags.push(
            `Amount is ${Math.round(ratio)}x higher than account average`
         );
      }
   }

   if (transaction.hourOfDay <= 4) {
      score += 10;
      redFlags.push(`Transaction at ${transaction.hourOfDay}am`);
   }

   if (transaction.cardPresent === false) {
      score += 10;
      redFlags.push('Card not physically present');
   }

   if (transaction.distanceFromLastTransaction >= 1000) {
      score += 15;
      redFlags.push(
         `Location is ${Math.round(transaction.distanceFromLastTransaction)}km from last transaction`
      );
   }

   if (transaction.accountAge <= 3) {
      score += 10;
      redFlags.push(`Account is only ${transaction.accountAge} months old`);
   }

   if (transaction.previousFraudFlags > 0) {
      score += 20;
      redFlags.push(
         `Account has ${transaction.previousFraudFlags} previous fraud flags`
      );
   }

   if (transaction.isInternational) {
      score += 10;
      redFlags.push('International transaction');
   }

   return {
      transactionId: transaction.id,
      suspicionScore: clampScore(score),
      redFlags,
   };
}
