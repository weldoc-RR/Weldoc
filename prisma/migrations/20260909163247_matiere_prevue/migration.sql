-- CreateTable
CREATE TABLE "MatierePrevue" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "normeProduit" TEXT NOT NULL,
    "nuance" TEXT NOT NULL,
    "diametre" DOUBLE PRECISION,
    "epaisseur" DOUBLE PRECISION,
    "quantitePrevue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatierePrevue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatierePrevue" ADD CONSTRAINT "MatierePrevue_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

