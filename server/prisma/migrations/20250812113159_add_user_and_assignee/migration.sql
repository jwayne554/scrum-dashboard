-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "estimate" REAL,
    "priority" INTEGER,
    "stateId" TEXT,
    "stateType" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "cycleId" TEXT,
    "relations" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT,
    CONSTRAINT "Issue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("canceledAt", "completedAt", "createdAt", "cycleId", "estimate", "id", "identifier", "priority", "relations", "startedAt", "stateId", "stateType", "teamId", "title", "updatedAt") SELECT "canceledAt", "completedAt", "createdAt", "cycleId", "estimate", "id", "identifier", "priority", "relations", "startedAt", "stateId", "stateType", "teamId", "title", "updatedAt" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
CREATE UNIQUE INDEX "Issue_identifier_key" ON "Issue"("identifier");
CREATE INDEX "Issue_teamId_cycleId_idx" ON "Issue"("teamId", "cycleId");
CREATE INDEX "Issue_stateType_idx" ON "Issue"("stateType");
CREATE INDEX "Issue_completedAt_idx" ON "Issue"("completedAt");
CREATE INDEX "Issue_assigneeId_idx" ON "Issue"("assigneeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
