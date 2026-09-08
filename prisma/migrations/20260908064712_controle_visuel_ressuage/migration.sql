-- CreateEnum
CREATE TYPE "ResultatControle" AS ENUM ('CONFORME', 'NON_CONFORME', 'A_VERIFIER');

-- CreateEnum
CREATE TYPE "TypeConsommableCND" AS ENUM ('PENETRANT', 'REVELATEUR', 'NETTOYANT');

-- CreateTable
CREATE TABLE "ControleVisuel" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "procedureRef" TEXT NOT NULL,
    "procedureVersion" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indications" JSONB NOT NULL,
    "resultat" "ResultatControle" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleVisuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsommableCND" (
    "id" TEXT NOT NULL,
    "type" "TypeConsommableCND" NOT NULL,
    "fabricant" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "lot" TEXT NOT NULL,
    "peremption" TIMESTAMP(3),
    "certificatUrl" TEXT,

    CONSTRAINT "ConsommableCND_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleRessuage" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "controleVisuelPrealableId" TEXT NOT NULL,
    "procedureRef" TEXT NOT NULL,
    "procedureVersion" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indications" JSONB NOT NULL,
    "resultat" "ResultatControle" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleRessuage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleRessuageConsommable" (
    "id" TEXT NOT NULL,
    "controleRessuageId" TEXT NOT NULL,
    "consommableId" TEXT NOT NULL,

    CONSTRAINT "ControleRessuageConsommable_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FNC" ADD COLUMN "controleVisuelOrigineId" TEXT;
ALTER TABLE "FNC" ADD COLUMN "controleRessuageOrigineId" TEXT;

-- CreateIndex
CREATE INDEX "ControleVisuel_jointId_idx" ON "ControleVisuel"("jointId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsommableCND_type_fabricant_reference_lot_key" ON "ConsommableCND"("type", "fabricant", "reference", "lot");

-- CreateIndex
CREATE INDEX "ControleRessuage_jointId_idx" ON "ControleRessuage"("jointId");

-- CreateIndex
CREATE UNIQUE INDEX "ControleRessuageConsommable_controleRessuageId_consommableI_key" ON "ControleRessuageConsommable"("controleRessuageId", "consommableId");

-- AddForeignKey
ALTER TABLE "ControleVisuel" ADD CONSTRAINT "ControleVisuel_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleVisuel" ADD CONSTRAINT "ControleVisuel_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRessuage" ADD CONSTRAINT "ControleRessuage_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRessuage" ADD CONSTRAINT "ControleRessuage_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRessuage" ADD CONSTRAINT "ControleRessuage_controleVisuelPrealableId_fkey" FOREIGN KEY ("controleVisuelPrealableId") REFERENCES "ControleVisuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRessuageConsommable" ADD CONSTRAINT "ControleRessuageConsommable_controleRessuageId_fkey" FOREIGN KEY ("controleRessuageId") REFERENCES "ControleRessuage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRessuageConsommable" ADD CONSTRAINT "ControleRessuageConsommable_consommableId_fkey" FOREIGN KEY ("consommableId") REFERENCES "ConsommableCND"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleVisuelOrigineId_fkey" FOREIGN KEY ("controleVisuelOrigineId") REFERENCES "ControleVisuel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleRessuageOrigineId_fkey" FOREIGN KEY ("controleRessuageOrigineId") REFERENCES "ControleRessuage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
