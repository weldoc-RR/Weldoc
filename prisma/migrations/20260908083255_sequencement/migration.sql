-- CreateEnum
CREATE TYPE "StatutDemandeSequencement" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'MODIFICATION_DEMANDEE');

-- CreateTable
CREATE TABLE "DemandeModificationSequencement" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "phasesConcerneesIds" TEXT[],
    "motif" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "documentUrl" TEXT,
    "demandeParId" TEXT NOT NULL,
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutDemandeSequencement" NOT NULL DEFAULT 'EN_ATTENTE',
    "decisionParId" TEXT,
    "dateDecision" TIMESTAMP(3),
    "commentaireDecision" TEXT,
    "conditions" TEXT,

    CONSTRAINT "DemandeModificationSequencement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeModificationSequencement_affaireId_idx" ON "DemandeModificationSequencement"("affaireId");

-- AddForeignKey
ALTER TABLE "DemandeModificationSequencement" ADD CONSTRAINT "DemandeModificationSequencement_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
