-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailTemplate_status_type_idx" ON "EmailTemplate"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_type_locale_key" ON "EmailTemplate"("type", "locale");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_templateId_createdAt_idx" ON "EmailTemplateVersion"("templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateVersion_templateId_version_key" ON "EmailTemplateVersion"("templateId", "version");
