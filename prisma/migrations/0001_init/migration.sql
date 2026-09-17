-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'EWALLET', 'INVESTMENT_CASH', 'OTHER_ASSET');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'RECURRING', 'IMPORT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdjustmentDirection" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "RolloverPolicy" AS ENUM ('NONE', 'CARRY_POSITIVE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'FEE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "cycleStartDay" INTEGER NOT NULL DEFAULT 25,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "openingBalance" BIGINT NOT NULL DEFAULT 0,
    "openingDate" DATE NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "parentId" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "categoryId" TEXT,
    "adjustmentDirection" "AdjustmentDirection",
    "note" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "importBatchId" TEXT,
    "recurringOccurrenceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycleStartDay" INTEGER NOT NULL DEFAULT 25,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cycleStart" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "rolloverPolicy" "RolloverPolicy" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "accountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "categoryId" TEXT,
    "dueDay" INTEGER NOT NULL,
    "cadenceMonths" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextDueDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" BIGINT NOT NULL,
    "targetDate" DATE,
    "linkedAccountId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalContribution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "assetType" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',

    CONSTRAINT "InvestmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "InvestmentType" NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "unitPrice" DECIMAL(24,8) NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPriceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(24,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "InvestmentPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "observedBalance" BIGINT NOT NULL,
    "calculatedBalance" BIGINT NOT NULL,
    "difference" BIGINT NOT NULL,
    "note" TEXT,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "fingerprint" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "mapped" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_isArchived_idx" ON "FinancialAccount"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_userId_name_key" ON "FinancialAccount"("userId", "name");

-- CreateIndex
CREATE INDEX "Category_userId_kind_isArchived_idx" ON "Category"("userId", "kind", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_kind_parentId_name_key" ON "Category"("userId", "kind", "parentId", "name");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionDate_status_idx" ON "Transaction"("userId", "transactionDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_source_externalId_key" ON "Transaction"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "BudgetPlan_userId_active_idx" ON "BudgetPlan"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAllocation_planId_categoryId_cycleStart_key" ON "BudgetAllocation"("planId", "categoryId", "cycleStart");

-- CreateIndex
CREATE UNIQUE INDEX "GoalContribution_goalId_transactionId_key" ON "GoalContribution"("goalId", "transactionId");

-- CreateIndex
CREATE INDEX "InvestmentAsset_userId_name_idx" ON "InvestmentAsset"("userId", "name");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_userId_transactionDate_idx" ON "InvestmentTransaction"("userId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPriceSnapshot_assetId_date_key" ON "InvestmentPriceSnapshot"("assetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_accountId_date_key" ON "BalanceSnapshot"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_userId_fingerprint_key" ON "ImportBatch"("userId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_batchId_rowNumber_key" ON "ImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_batchId_fingerprint_key" ON "ImportRow"("batchId", "fingerprint");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BudgetPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAsset" ADD CONSTRAINT "InvestmentAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPriceSnapshot" ADD CONSTRAINT "InvestmentPriceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPriceSnapshot" ADD CONSTRAINT "InvestmentPriceSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_cycle_day_check" CHECK ("cycleStartDay" BETWEEN 1 AND 28);
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_cycle_day_check" CHECK ("cycleStartDay" BETWEEN 1 AND 28);
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_amount_check" CHECK ("amount" > 0 AND "dueDay" BETWEEN 1 AND 28 AND "cadenceMonths" > 0);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_amount_check" CHECK ("targetAmount" > 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_shape_check" CHECK (
  ("type" IN ('INCOME', 'EXPENSE') AND "categoryId" IS NOT NULL AND "destinationAccountId" IS NULL AND "adjustmentDirection" IS NULL)
  OR ("type" = 'TRANSFER' AND "categoryId" IS NULL AND "destinationAccountId" IS NOT NULL AND "destinationAccountId" <> "accountId" AND "adjustmentDirection" IS NULL)
  OR ("type" = 'ADJUSTMENT' AND "categoryId" IS NULL AND "destinationAccountId" IS NULL AND "adjustmentDirection" IS NOT NULL AND length(trim(coalesce("note", ''))) > 0)
);
