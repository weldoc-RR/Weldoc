-- RenameEnum
-- StatutQualification est renommé en StatutValidite : mêmes valeurs, réutilisé
-- pour Qualification/Habilitation/Formation/AcuiteVisuelle. Un rename ne perd
-- aucune donnée : la colonne "statut" de Qualification continue de pointer
-- vers le même type, juste renommé.
ALTER TYPE "StatutQualification" RENAME TO "StatutValidite";

-- CreateTable
CREATE TABLE "Habilitation" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "reference" TEXT,
    "dateObtention" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "statut" "StatutValidite" NOT NULL DEFAULT 'VALIDE',
    "certificatUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habilitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "organisme" TEXT,
    "dateRealisation" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "statut" "StatutValidite" NOT NULL DEFAULT 'VALIDE',
    "certificatUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcuiteVisuelle" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "dateTest" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "apte" BOOLEAN NOT NULL,
    "organisme" TEXT,
    "certificatUrl" TEXT,
    "statut" "StatutValidite" NOT NULL DEFAULT 'VALIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcuiteVisuelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habilitation_personnelId_idx" ON "Habilitation"("personnelId");

-- CreateIndex
CREATE INDEX "Formation_personnelId_idx" ON "Formation"("personnelId");

-- CreateIndex
CREATE INDEX "AcuiteVisuelle_personnelId_idx" ON "AcuiteVisuelle"("personnelId");

-- AddForeignKey
ALTER TABLE "Habilitation" ADD CONSTRAINT "Habilitation_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuiteVisuelle" ADD CONSTRAINT "AcuiteVisuelle_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
