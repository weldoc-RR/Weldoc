-- AlterTable
ALTER TABLE "Qualification" ADD COLUMN     "codeQualification" TEXT,
ADD COLUMN     "diametreMaxMm" DOUBLE PRECISION,
ADD COLUMN     "diametreMinMm" DOUBLE PRECISION,
ADD COLUMN     "epaisseurMaxMm" DOUBLE PRECISION,
ADD COLUMN     "epaisseurMinMm" DOUBLE PRECISION,
ADD COLUMN     "groupeMateriaux" TEXT,
ADD COLUMN     "positionSoudage" TEXT,
ADD COLUMN     "referentielId" TEXT;
-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
