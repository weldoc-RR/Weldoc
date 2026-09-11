-- CreateEnum
CREATE TYPE "TypeEtatDesLieux" AS ENUM ('PRISE_EN_CHARGE', 'RESTITUTION');
-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "etatDesLieuxId" TEXT;
-- CreateTable
CREATE TABLE "EtatDesLieux" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "type" "TypeEtatDesLieux" NOT NULL,
    "zone" TEXT,
    "redacteurId" TEXT NOT NULL,
    "dateConstat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observations" TEXT,
    "degradationsConstatees" TEXT,
    "documentsEntree" TEXT,
    "signatureId" TEXT,
    CONSTRAINT "EtatDesLieux_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ReserveConstat" (
    "id" TEXT NOT NULL,
    "etatDesLieuxId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "transmiseAuClient" BOOLEAN NOT NULL DEFAULT false,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReserveConstat_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "EtatDesLieux_affaireId_idx" ON "EtatDesLieux"("affaireId");
-- CreateIndex
CREATE INDEX "ReserveConstat_etatDesLieuxId_idx" ON "ReserveConstat"("etatDesLieuxId");
-- CreateIndex
CREATE INDEX "Photo_etatDesLieuxId_idx" ON "Photo"("etatDesLieuxId");
-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_etatDesLieuxId_fkey" FOREIGN KEY ("etatDesLieuxId") REFERENCES "EtatDesLieux"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_redacteurId_fkey" FOREIGN KEY ("redacteurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ReserveConstat" ADD CONSTRAINT "ReserveConstat_etatDesLieuxId_fkey" FOREIGN KEY ("etatDesLieuxId") REFERENCES "EtatDesLieux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
