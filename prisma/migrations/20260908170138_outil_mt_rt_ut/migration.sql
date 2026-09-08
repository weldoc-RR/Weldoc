-- AlterTable
ALTER TABLE "ControleMagnetoscopie" ADD COLUMN     "outilId" TEXT;
-- AlterTable
ALTER TABLE "ControleRadiographie" ADD COLUMN     "outilId" TEXT;
-- AlterTable
ALTER TABLE "ControleUltrasons" ADD COLUMN     "outilId" TEXT;
-- AddForeignKey
ALTER TABLE "ControleMagnetoscopie" ADD CONSTRAINT "ControleMagnetoscopie_outilId_fkey" FOREIGN KEY ("outilId") REFERENCES "Outil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleRadiographie" ADD CONSTRAINT "ControleRadiographie_outilId_fkey" FOREIGN KEY ("outilId") REFERENCES "Outil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ControleUltrasons" ADD CONSTRAINT "ControleUltrasons_outilId_fkey" FOREIGN KEY ("outilId") REFERENCES "Outil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
