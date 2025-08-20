-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "progress" REAL NOT NULL DEFAULT 0,
    "initialScope" REAL,
    "finalScope" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cycle_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CycleHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cycleId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "issueCount" INTEGER NOT NULL,
    "completedIssueCount" INTEGER NOT NULL,
    "scope" REAL NOT NULL,
    "completedScope" REAL NOT NULL,
    "inProgressScope" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CycleHistory_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Issue" (
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
    CONSTRAINT "Issue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueLabel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "issueId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "IssueLabel_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cycleId" TEXT NOT NULL,
    "json" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_key_key" ON "Team"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Cycle_teamId_number_key" ON "Cycle"("teamId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CycleHistory_cycleId_dayIndex_key" ON "CycleHistory"("cycleId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_identifier_key" ON "Issue"("identifier");

-- CreateIndex
CREATE INDEX "Issue_teamId_cycleId_idx" ON "Issue"("teamId", "cycleId");

-- CreateIndex
CREATE INDEX "Issue_stateType_idx" ON "Issue"("stateType");

-- CreateIndex
CREATE INDEX "Issue_completedAt_idx" ON "Issue"("completedAt");

-- CreateIndex
CREATE INDEX "IssueLabel_label_idx" ON "IssueLabel"("label");

-- CreateIndex
CREATE UNIQUE INDEX "IssueLabel_issueId_label_key" ON "IssueLabel"("issueId", "label");

-- CreateIndex
CREATE INDEX "Snapshot_cycleId_idx" ON "Snapshot"("cycleId");
