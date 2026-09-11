-- AlterTable
ALTER TABLE "ControleDimensionnel" ADD COLUMN     "produitDimensionnelId" TEXT;
-- CreateTable
CREATE TABLE "ProduitDimensionnel" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'Rev 0',
    "designation" TEXT NOT NULL,
    "type" TEXT,
    "normeProduit" TEXT NOT NULL,
    "diametreNominalMm" DOUBLE PRECISION,
    "epaisseurNominaleMm" DOUBLE PRECISION,
    "finition" TEXT,
    "etat" TEXT,
    "classeType" TEXT,
    "diametreMiniMm" DOUBLE PRECISION NOT NULL,
    "diametreMaxiMm" DOUBLE PRECISION NOT NULL,
    "epaisseurMiniMm" DOUBLE PRECISION NOT NULL,
    "epaisseurMaxiMm" DOUBLE PRECISION NOT NULL,
    "referentielId" TEXT,
    "retiree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProduitDimensionnel_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "ProduitDimensionnel_reference_idx" ON "ProduitDimensionnel"("reference");
-- AddForeignKey
ALTER TABLE "ControleDimensionnel" ADD CONSTRAINT "ControleDimensionnel_produitDimensionnelId_fkey" FOREIGN KEY ("produitDimensionnelId") REFERENCES "ProduitDimensionnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ProduitDimensionnel" ADD CONSTRAINT "ProduitDimensionnel_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
