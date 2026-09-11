-- CreateTable
CREATE TABLE "DocumentJustificatifPersonnel" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "reference" TEXT,
    "documentUrl" TEXT NOT NULL,
    "dateDocument" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "statut" "StatutValidite" NOT NULL DEFAULT 'VALIDE',
    "ajouteParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentJustificatifPersonnel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentJustificatifPersonnel_personnelId_idx" ON "DocumentJustificatifPersonnel"("personnelId");

-- AddForeignKey
ALTER TABLE "DocumentJustificatifPersonnel" ADD CONSTRAINT "DocumentJustificatifPersonnel_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentJustificatifPersonnel" ADD CONSTRAINT "DocumentJustificatifPersonnel_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

