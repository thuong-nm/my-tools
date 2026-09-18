-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('PLAIN', 'MARKDOWN', 'JSON', 'XML', 'HTML', 'HTML_RENDER');

-- CreateTable
CREATE TABLE "TextShare" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TextShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TextShare_code_key" ON "TextShare"("code");

-- CreateIndex
CREATE INDEX "TextShare_expiresAt_idx" ON "TextShare"("expiresAt");

