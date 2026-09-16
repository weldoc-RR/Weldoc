-- AlterTable
ALTER TABLE "Affaire" ADD COLUMN     "tranche" TEXT,
ADD COLUMN     "libelleActivite" TEXT,
ADD COLUMN     "metier" TEXT,
ADD COLUMN     "equipementsConcernes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "otTaches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "domaineRequisInstallation" TEXT,
ADD COLUMN     "conditionsParticulieresPrealables" TEXT,
ADD COLUMN     "numeroAdrModele" TEXT;

-- AlterTable
ALTER TABLE "Phase" ADD COLUMN     "libelleControleTechnique" TEXT,
ADD COLUMN     "attendusControleTechnique" TEXT,
ADD COLUMN     "numeroAdrSpecifique" TEXT;

-- CreateEnum
CREATE TYPE "FonctionSignature" AS ENUM ('EXECUTANT', 'CONTROLEUR_TECHNIQUE', 'SURVEILLANT', 'VERIFICATEUR');

-- CreateTable
CREATE TABLE "RevisionFicheActivite" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "indice" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "natureEvolution" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisionFicheActivite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignaturePhase" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "fonction" "FonctionSignature" NOT NULL,
    "habilitation" TEXT,
    "nni" TEXT,
    "entrepriseService" TEXT,
    "signatureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignaturePhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevisionFicheActivite_affaireId_idx" ON "RevisionFicheActivite"("affaireId");

-- CreateIndex
CREATE UNIQUE INDEX "SignaturePhase_signatureId_key" ON "SignaturePhase"("signatureId");

-- CreateIndex
CREATE INDEX "SignaturePhase_phaseId_idx" ON "SignaturePhase"("phaseId");

-- CreateIndex
CREATE INDEX "SignaturePhase_personnelId_idx" ON "SignaturePhase"("personnelId");

-- AddForeignKey
ALTER TABLE "RevisionFicheActivite" ADD CONSTRAINT "RevisionFicheActivite_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignaturePhase" ADD CONSTRAINT "SignaturePhase_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignaturePhase" ADD CONSTRAINT "SignaturePhase_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignaturePhase" ADD CONSTRAINT "SignaturePhase_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
