-- CreateEnum
CREATE TYPE "StatutPointReglementaire" AS ENUM ('NON_BLOQUANT', 'BLOQUANT', 'SOUS_RESERVE', 'ATTENTE_DECISION', 'DEBLOCAGE_AUTORISE');
-- CreateTable
CREATE TABLE "PointReglementaire" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "jointId" TEXT,
    "phaseId" TEXT,
    "intitule" TEXT NOT NULL,
    "referentiel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointReglementaire_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PointReglementaireEvenement" (
    "id" TEXT NOT NULL,
    "pointReglementaireId" TEXT NOT NULL,
    "statut" "StatutPointReglementaire" NOT NULL,
    "commentaire" TEXT,
    "auteurId" TEXT NOT NULL,
    "signatureId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointReglementaireEvenement_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "PointReglementaire_affaireId_idx" ON "PointReglementaire"("affaireId");
-- CreateIndex
CREATE INDEX "PointReglementaireEvenement_pointReglementaireId_idx" ON "PointReglementaireEvenement"("pointReglementaireId");
-- AddForeignKey
ALTER TABLE "PointReglementaire" ADD CONSTRAINT "PointReglementaire_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PointReglementaire" ADD CONSTRAINT "PointReglementaire_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PointReglementaire" ADD CONSTRAINT "PointReglementaire_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PointReglementaireEvenement" ADD CONSTRAINT "PointReglementaireEvenement_pointReglementaireId_fkey" FOREIGN KEY ("pointReglementaireId") REFERENCES "PointReglementaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PointReglementaireEvenement" ADD CONSTRAINT "PointReglementaireEvenement_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
