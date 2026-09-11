-- AlterTable
ALTER TABLE "Phase" ADD COLUMN     "procedureInterneId" TEXT;
-- CreateTable
CREATE TABLE "ProcedureInterne" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'Rev 0',
    "titre" TEXT NOT NULL,
    "type" TEXT,
    "documentUrl" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "retiree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcedureInterne_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "ProcedureInterne_reference_idx" ON "ProcedureInterne"("reference");
-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_procedureInterneId_fkey" FOREIGN KEY ("procedureInterneId") REFERENCES "ProcedureInterne"("id") ON DELETE SET NULL ON UPDATE CASCADE;
