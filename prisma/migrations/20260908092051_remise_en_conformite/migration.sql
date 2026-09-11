-- CreateEnum
CREATE TYPE "TypeActionRemiseEnConformite" AS ENUM ('REPARATION', 'MEULAGE', 'RESURFACAGE', 'REPRISE', 'REMPLACEMENT', 'CONTROLE_COMPLEMENTAIRE');

-- AlterTable
ALTER TABLE "Joint" ADD COLUMN "typeAction" "TypeActionRemiseEnConformite";

-- AlterTable
ALTER TABLE "FNC" ADD COLUMN "actionCorrectiveJointId" TEXT;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_actionCorrectiveJointId_fkey" FOREIGN KEY ("actionCorrectiveJointId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
