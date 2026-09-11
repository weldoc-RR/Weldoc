-- AlterTable
ALTER TABLE "Affaire" ADD COLUMN     "controlesRequis" TEXT[] DEFAULT ARRAY[]::TEXT[];

