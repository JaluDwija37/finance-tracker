CREATE TYPE "BudgetPeriod" AS ENUM ('DAY', 'MONTH', 'YEAR');

CREATE TABLE "BudgetLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "amount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetLimit_userId_categoryId_period_key" ON "BudgetLimit"("userId", "categoryId", "period");
CREATE INDEX "BudgetLimit_userId_period_idx" ON "BudgetLimit"("userId", "period");
ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
