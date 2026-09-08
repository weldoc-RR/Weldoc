-- AlterEnum
ALTER TYPE "TypeEvenementQualification" ADD VALUE 'CONFIRMATION_VALIDITE';
-- AlterTable
ALTER TABLE "Qualification" ADD COLUMN     "frequenceConfirmationMois" INTEGER;
