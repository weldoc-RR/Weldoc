-- CreateTable
CREATE TABLE "AutorisationSignature" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "accordeeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutorisationSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutorisationSignature_documentType_idx" ON "AutorisationSignature"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "AutorisationSignature_personnelId_documentType_key" ON "AutorisationSignature"("personnelId", "documentType");

-- AddForeignKey
ALTER TABLE "AutorisationSignature" ADD CONSTRAINT "AutorisationSignature_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorisationSignature" ADD CONSTRAINT "AutorisationSignature_accordeeParId_fkey" FOREIGN KEY ("accordeeParId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

