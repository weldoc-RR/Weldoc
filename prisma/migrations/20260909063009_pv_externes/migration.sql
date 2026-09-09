-- CreateEnum
CREATE TYPE "ConclusionRevuePVExterne" AS ENUM ('CONFORME', 'NON_CONFORME');
-- CreateTable
CREATE TABLE "PVExterne" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "jointId" TEXT,
    "phaseId" TEXT,
    "intitule" TEXT NOT NULL,
    "prestataire" TEXT,
    "url" TEXT NOT NULL,
    "dateDocument" TIMESTAMP(3),
    "importeParId" TEXT NOT NULL,
    "dateImport" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revueConclusion" "ConclusionRevuePVExterne",
    "revueCommentaire" TEXT,
    "revueParId" TEXT,
    "dateRevue" TIMESTAMP(3),
    CONSTRAINT "PVExterne_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "PVExterne_affaireId_idx" ON "PVExterne"("affaireId");
-- CreateIndex
CREATE INDEX "PVExterne_jointId_idx" ON "PVExterne"("jointId");
-- AddForeignKey
ALTER TABLE "PVExterne" ADD CONSTRAINT "PVExterne_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PVExterne" ADD CONSTRAINT "PVExterne_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PVExterne" ADD CONSTRAINT "PVExterne_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PVExterne" ADD CONSTRAINT "PVExterne_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PVExterne" ADD CONSTRAINT "PVExterne_revueParId_fkey" FOREIGN KEY ("revueParId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
