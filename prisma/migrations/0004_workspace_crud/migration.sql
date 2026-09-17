ALTER TYPE "BudgetPeriod" ADD VALUE 'CYCLE';
ALTER TABLE "SavingsGoal" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InvestmentAsset" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InvestmentTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3);
