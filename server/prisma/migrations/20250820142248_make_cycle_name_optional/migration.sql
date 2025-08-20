-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
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
INSERT INTO "new_Cycle" ("completedAt", "createdAt", "endsAt", "finalScope", "id", "initialScope", "name", "number", "progress", "startsAt", "teamId", "updatedAt") SELECT "completedAt", "createdAt", "endsAt", "finalScope", "id", "initialScope", "name", "number", "progress", "startsAt", "teamId", "updatedAt" FROM "Cycle";
DROP TABLE "Cycle";
ALTER TABLE "new_Cycle" RENAME TO "Cycle";
CREATE UNIQUE INDEX "Cycle_teamId_number_key" ON "Cycle"("teamId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
