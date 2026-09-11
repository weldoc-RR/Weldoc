-- CreateTable
CREATE TABLE "ControleMagnetoscopie" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "procedureRef" TEXT NOT NULL,
    "procedureVersion" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indications" JSONB NOT NULL,
    "resultat" "ResultatControle" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleMagnetoscopie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleRadiographie" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "procedureRef" TEXT NOT NULL,
    "procedureVersion" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indications" JSONB NOT NULL,
    "resultat" "ResultatControle" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleRadiographie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleUltrasons" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "procedureRef" TEXT NOT NULL,
    "procedureVersion" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indications" JSONB NOT NULL,
    "resultat" "ResultatControle" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleUltrasons_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FNC" ADD COLUMN "controleMagnetoscopieOrigineId" TEXT;
ALTER TABLE "FNC" ADD COLUMN "controleRadiographieOrigineId" TEXT;
ALTER TABLE "FNC" ADD COLUMN "controleUltrasonsOrigineId" TEXT;

-- CreateIndex
CREATE INDEX "ControleMagnetoscopie_jointId_idx" ON "ControleMagnetoscopie"("jointId");

-- CreateIndex
CREATE INDEX "ControleRadiographie_jointId_idx" ON "ControleRadiographie"("jointId");

-- CreateIndex
CREATE INDEX "ControleUltrasons_jointId_idx" ON "ControleUltrasons"("jointId");

-- AddForeignKey
ALTER TABLE "ControleMagnetoscopie" ADD CONSTRAINT "ControleMagnetoscopie_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleMagnetoscopie" ADD CONSTRAINT "ControleMagnetoscopie_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRadiographie" ADD CONSTRAINT "ControleRadiographie_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleRadiographie" ADD CONSTRAINT "ControleRadiographie_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleUltrasons" ADD CONSTRAINT "ControleUltrasons_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleUltrasons" ADD CONSTRAINT "ControleUltrasons_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleMagnetoscopieOrigineId_fkey" FOREIGN KEY ("controleMagnetoscopieOrigineId") REFERENCES "ControleMagnetoscopie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleRadiographieOrigineId_fkey" FOREIGN KEY ("controleRadiographieOrigineId") REFERENCES "ControleRadiographie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleUltrasonsOrigineId_fkey" FOREIGN KEY ("controleUltrasonsOrigineId") REFERENCES "ControleUltrasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
