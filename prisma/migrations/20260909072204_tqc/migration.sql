-- CreateTable
CREATE TABLE "TQC" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "localisation" TEXT,
    "equipement" TEXT,
    "support" TEXT,
    "ecarts" TEXT,
    "observations" TEXT,
    "signatureId" TEXT,
    CONSTRAINT "TQC_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "TQC_jointId_key" ON "TQC"("jointId");
-- AddForeignKey
ALTER TABLE "TQC" ADD CONSTRAINT "TQC_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
