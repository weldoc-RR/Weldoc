-- CreateEnum
CREATE TYPE "StatutPiece" AS ENUM ('PRISE_EN_CHARGE', 'EN_FABRICATION', 'TERMINEE', 'EXPEDIEE');

-- CreateTable
CREATE TABLE "Piece" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "designation" TEXT,
    "photosUrls" TEXT[],
    "priseEnChargeParId" TEXT NOT NULL,
    "datePriseEnCharge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutPiece" NOT NULL DEFAULT 'PRISE_EN_CHARGE',

    CONSTRAINT "Piece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Piece_affaireId_idx" ON "Piece"("affaireId");

-- CreateIndex
CREATE UNIQUE INDEX "Piece_affaireId_reference_key" ON "Piece"("affaireId", "reference");

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
