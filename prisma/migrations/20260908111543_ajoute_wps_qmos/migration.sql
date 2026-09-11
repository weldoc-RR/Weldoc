-- AlterTable
ALTER TABLE "Joint" ADD COLUMN     "qmosId" TEXT,
ADD COLUMN     "wpsId" TEXT;
-- CreateTable
CREATE TABLE "Qmos" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'Rev 0',
    "procede" TEXT NOT NULL,
    "normeReference" TEXT NOT NULL,
    "laboratoire" TEXT,
    "dateEssai" TIMESTAMP(3),
    "certificatUrl" TEXT,
    "retiree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Qmos_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Wps" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'Rev 0',
    "procede" TEXT NOT NULL,
    "normeReference" TEXT NOT NULL,
    "materiaux" TEXT,
    "epaisseurMinMm" DOUBLE PRECISION,
    "epaisseurMaxMm" DOUBLE PRECISION,
    "diametreMinMm" DOUBLE PRECISION,
    "diametreMaxMm" DOUBLE PRECISION,
    "positions" TEXT,
    "qmosId" TEXT,
    "documentUrl" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "retiree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wps_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Qmos_reference_idx" ON "Qmos"("reference");
-- CreateIndex
CREATE UNIQUE INDEX "Qmos_reference_version_key" ON "Qmos"("reference", "version");
-- CreateIndex
CREATE INDEX "Wps_reference_idx" ON "Wps"("reference");
-- CreateIndex
CREATE UNIQUE INDEX "Wps_reference_version_key" ON "Wps"("reference", "version");
-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_wpsId_fkey" FOREIGN KEY ("wpsId") REFERENCES "Wps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_qmosId_fkey" FOREIGN KEY ("qmosId") REFERENCES "Qmos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Wps" ADD CONSTRAINT "Wps_qmosId_fkey" FOREIGN KEY ("qmosId") REFERENCES "Qmos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
