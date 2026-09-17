ALTER TABLE "BudgetAllocation" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "GoalContribution" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "ImportRow" ADD COLUMN "userId" TEXT NOT NULL;
CREATE INDEX "BudgetAllocation_userId_cycleStart_idx" ON "BudgetAllocation"("userId", "cycleStart");
CREATE INDEX "GoalContribution_userId_idx" ON "GoalContribution"("userId");
CREATE INDEX "ImportRow_userId_idx" ON "ImportRow"("userId");
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
