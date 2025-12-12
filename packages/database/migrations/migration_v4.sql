-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApifyScrapeJob";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScrapeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "postUrl" TEXT,
    "input" TEXT,
    "apifyRunId" TEXT,
    "actorId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScrapeJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScrapeJob" ("createdAt", "errorMessage", "id", "metadata", "postUrl", "status", "updatedAt", "userId") SELECT "createdAt", "errorMessage", "id", "metadata", "postUrl", "status", "updatedAt", "userId" FROM "ScrapeJob";
DROP TABLE "ScrapeJob";
ALTER TABLE "new_ScrapeJob" RENAME TO "ScrapeJob";
CREATE INDEX "ScrapeJob_userId_idx" ON "ScrapeJob"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
