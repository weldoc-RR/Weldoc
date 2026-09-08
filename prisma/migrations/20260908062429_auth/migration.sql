-- CreateEnum
CREATE TYPE "StatutCompte" AS ENUM ('ACTIF', 'SUSPENDU');

-- CreateTable
CREATE TABLE "Compte" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "statut" "StatutCompte" NOT NULL DEFAULT 'ACTIF',
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "revoqueLe" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Compte_personnelId_key" ON "Compte"("personnelId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_compteId_idx" ON "Session"("compteId");

-- AddForeignKey
ALTER TABLE "Compte" ADD CONSTRAINT "Compte_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
