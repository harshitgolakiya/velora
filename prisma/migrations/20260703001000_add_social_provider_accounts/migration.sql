-- CreateTable
CREATE TABLE "SocialProviderAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialProviderAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialProviderAccount_provider_providerAccountId_key" ON "SocialProviderAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "SocialProviderAccount_userId_provider_idx" ON "SocialProviderAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "SocialProviderAccount_email_idx" ON "SocialProviderAccount"("email");
