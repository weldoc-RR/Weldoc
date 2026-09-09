-- DropForeignKey
ALTER TABLE "FicheTechniqueSoudage" DROP CONSTRAINT "FicheTechniqueSoudage_jointId_fkey";

-- DropIndex
DROP INDEX "FicheTechniqueSoudage_jointId_key";

-- AlterTable
ALTER TABLE "Joint" ADD COLUMN     "ficheSoudageId" TEXT;

-- AlterTable
ALTER TABLE "FicheTechniqueSoudage" DROP COLUMN "jointId";

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_ficheSoudageId_fkey" FOREIGN KEY ("ficheSoudageId") REFERENCES "FicheTechniqueSoudage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

