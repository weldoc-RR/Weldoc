-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "TypeConsommableCND" ADD VALUE 'POUDRE_MAGNETIQUE';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'PRODUIT_CONTRASTE';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'DEMAGNETISANT';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'FILM_RADIOGRAPHIQUE';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'PRODUIT_DEVELOPPEMENT';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'COUPLANT';
ALTER TYPE "TypeConsommableCND" ADD VALUE 'AUTRE';
-- CreateTable
CREATE TABLE "ControleMagnetoscopieConsommable" (
    "id" TEXT NOT NULL,
    "controleMagnetoscopieId" TEXT NOT NULL,
    "consommableId" TEXT NOT NULL,
    CONSTRAINT "ControleMagnetoscopieConsommable_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ControleRadiographieConsommable" (
    "id" TEXT NOT NULL,
    "controleRadiographieId" TEXT NOT NULL,
    "consommableId" TEXT NOT NULL,
    CONSTRAINT "ControleRadiographieConsommable_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ControleUltrasonsConsommable" (
    "id" TEXT NOT NULL,
    "controleUltrasonsId" TEXT NOT NULL,
    "consommableId" TEXT NOT NULL,
    CONSTRAINT "ControleUltrasonsConsommable_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "ControleMagnetoscopieConsommable_controleMagnetoscopieId_co_key" ON "ControleMagnetoscopieConsommable"("controleMagnetoscopieId", "consommableId");
-- CreateIndex
CREATE UNIQUE INDEX "ControleRadiographieConsommable_controleRadiographieId_cons_key" ON "ControleRadiographieConsommable"("controleRadiographieId", "consommableId");
-- CreateIndex
CREATE UNIQUE INDEX "ControleUltrasonsConsommable_controleUltrasonsId_consommabl_key" ON "ControleUltrasonsConsommable"("controleUltrasonsId", "consommableId");
-- AddForeignKey
ALTER TABLE "ControleMagnetoscopieConsommable" ADD CONSTRAINT "ControleMagnetoscopieConsommable_controleMagnetoscopieId_fkey" FOREIGN KEY ("controleMagnetoscopieId") REFERENCES "ControleMagnetoscopie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleMagnetoscopieConsommable" ADD CONSTRAINT "ControleMagnetoscopieConsommable_consommableId_fkey" FOREIGN KEY ("consommableId") REFERENCES "ConsommableCND"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleRadiographieConsommable" ADD CONSTRAINT "ControleRadiographieConsommable_controleRadiographieId_fkey" FOREIGN KEY ("controleRadiographieId") REFERENCES "ControleRadiographie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleRadiographieConsommable" ADD CONSTRAINT "ControleRadiographieConsommable_consommableId_fkey" FOREIGN KEY ("consommableId") REFERENCES "ConsommableCND"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleUltrasonsConsommable" ADD CONSTRAINT "ControleUltrasonsConsommable_controleUltrasonsId_fkey" FOREIGN KEY ("controleUltrasonsId") REFERENCES "ControleUltrasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleUltrasonsConsommable" ADD CONSTRAINT "ControleUltrasonsConsommable_consommableId_fkey" FOREIGN KEY ("consommableId") REFERENCES "ConsommableCND"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
