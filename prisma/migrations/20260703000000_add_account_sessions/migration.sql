-- CreateTable
CREATE TABLE "AccountSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL DEFAULT 'Signed-in device',
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    CONSTRAINT "AccountSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSession_sessionToken_key" ON "AccountSession"("sessionToken");

-- CreateIndex
CREATE INDEX "AccountSession_userId_revokedAt_lastSeenAt_idx" ON "AccountSession"("userId", "revokedAt", "lastSeenAt");
