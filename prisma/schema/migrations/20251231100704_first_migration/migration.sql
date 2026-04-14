-- CreateEnum
CREATE TYPE "FinalVerdict" AS ENUM ('FRAUD', 'LEGITIMATE');

-- CreateTable
CREATE TABLE "ProcessingRun" (
    "id" TEXT NOT NULL,
    "langfuseSessionId" TEXT,
    "totalPromptTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCompletionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "merchantCategory" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "accountAge" INTEGER NOT NULL,
    "avgMonthlySpend" DECIMAL(14,2) NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "previousFraudFlags" INTEGER NOT NULL,
    "distanceFromLastTransaction" DOUBLE PRECISION NOT NULL,
    "timeSinceLastTransaction" DOUBLE PRECISION NOT NULL,
    "isInternational" BOOLEAN NOT NULL,
    "cardPresent" BOOLEAN NOT NULL,
    "llmSkipped" BOOLEAN NOT NULL DEFAULT false,
    "finalVerdict" "FinalVerdict",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "suspicionScore" INTEGER NOT NULL,
    "redFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "verdict" "FinalVerdict" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_runId_idx" ON "Transaction"("runId");

-- CreateIndex
CREATE INDEX "Transaction_finalVerdict_idx" ON "Transaction"("finalVerdict");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_transactionId_key" ON "Investigation"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_transactionId_key" ON "Decision"("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProcessingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
