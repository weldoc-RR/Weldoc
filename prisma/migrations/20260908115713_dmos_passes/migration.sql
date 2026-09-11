-- CreateEnum
CREATE TYPE "TypeAssemblageSoudure" AS ENUM ('BOUT_A_BOUT', 'ANGLE', 'EMMANCHE_SOUDE', 'RECHARGEMENT', 'AUTRE');
-- AlterTable
ALTER TABLE "Wps" ADD COLUMN     "preparationNotes" TEXT,
ADD COLUMN     "typeAssemblage" "TypeAssemblageSoudure";
-- CreateTable
CREATE TABLE "WpsPasse" (
    "id" TEXT NOT NULL,
    "wpsId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "procede" TEXT NOT NULL,
    "modeOperatoire" TEXT,
    "position" TEXT,
    "metalApportType" TEXT,
    "metalApportDesignationNormalisee" TEXT,
    "metalApportDesignationCommerciale" TEXT,
    "metalApportDiametreMm" DOUBLE PRECISION,
    "gazEndroitNature" TEXT,
    "gazEndroitDebit" TEXT,
    "gazEnversNature" TEXT,
    "gazEnversDebit" TEXT,
    "natureCourantPolarite" TEXT,
    "intensiteAMin" DOUBLE PRECISION,
    "intensiteAMax" DOUBLE PRECISION,
    "tensionVMin" DOUBLE PRECISION,
    "tensionVMax" DOUBLE PRECISION,
    "temperatureMiniPieceC" DOUBLE PRECISION,
    "temperatureMaxiEntrePassesC" DOUBLE PRECISION,
    "observations" TEXT,
    CONSTRAINT "WpsPasse_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "WpsPasse_wpsId_idx" ON "WpsPasse"("wpsId");
-- AddForeignKey
ALTER TABLE "WpsPasse" ADD CONSTRAINT "WpsPasse_wpsId_fkey" FOREIGN KEY ("wpsId") REFERENCES "Wps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
