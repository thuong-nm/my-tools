-- CreateTable
CREATE TABLE "TextShareView" (
    "shareId" UUID NOT NULL,
    "viewerHash" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextShareView_pkey" PRIMARY KEY ("shareId","viewerHash")
);

-- AddForeignKey
ALTER TABLE "TextShareView" ADD CONSTRAINT "TextShareView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "TextShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

