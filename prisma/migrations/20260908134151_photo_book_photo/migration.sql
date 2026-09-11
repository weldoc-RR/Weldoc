-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "phaseId" TEXT,
    "jointId" TEXT,
    "fncId" TEXT,
    "url" TEXT NOT NULL,
    "commentaire" TEXT,
    "auteurId" TEXT NOT NULL,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Photo_affaireId_idx" ON "Photo"("affaireId");
-- CreateIndex
CREATE INDEX "Photo_jointId_idx" ON "Photo"("jointId");
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_fncId_fkey" FOREIGN KEY ("fncId") REFERENCES "FNC"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
