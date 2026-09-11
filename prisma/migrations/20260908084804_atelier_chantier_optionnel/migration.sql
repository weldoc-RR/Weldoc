-- CreateEnum
CREATE TYPE "TypeRealisation" AS ENUM ('CHANTIER', 'ATELIER');

-- AlterTable
ALTER TABLE "Affaire" ADD COLUMN "typeRealisation" "TypeRealisation" NOT NULL DEFAULT 'CHANTIER';
ALTER TABLE "Affaire" ALTER COLUMN "chantier" DROP NOT NULL;
ALTER TABLE "Affaire" ALTER COLUMN "site" DROP NOT NULL;
