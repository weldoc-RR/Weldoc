-- AlterTable
ALTER TABLE "Affaire" ADD COLUMN     "documentsRequis" TEXT[] DEFAULT ARRAY[]::TEXT[];

