-- CreateEnum
CREATE TYPE "AccessibiliteDocument" AS ENUM ('LIBRE', 'INTERNE', 'LIMITEE', 'CONFIDENTIELLE');
-- CreateEnum
CREATE TYPE "PorteeDiffusion" AS ENUM ('INTERNE', 'EXTERNE');
-- CreateTable
CREATE TABLE "BilanIntervention" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "entiteEmettrice" TEXT,
    "referenceOffreService" TEXT,
    "accessibilite" "AccessibiliteDocument",
    "definitionIntervention" TEXT,
    "rexPosesDeposes" TEXT,
    "ecartsTravauxPrevusRealises" TEXT,
    "conformiteTravaux" TEXT,
    "bilanActionsRadioprotection" TEXT,
    "analyseEcartsRadioprotectionAmelioration" TEXT,
    "bonnesPratiques" TEXT,
    "dysfonctionnements" TEXT,
    "mesuresCorrectivesSuivantes" TEXT,
    CONSTRAINT "BilanIntervention_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DiffusionRFI" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "portee" "PorteeDiffusion" NOT NULL,
    "nom" TEXT NOT NULL,
    "organisme" TEXT,
    CONSTRAINT "DiffusionRFI_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "RevisionRFI" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "indice" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "natureEvolutions" TEXT NOT NULL,
    "redacteurs" TEXT,
    "verificateurs" TEXT,
    "approbateurs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisionRFI_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PerimetreTravaux" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "intervenant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PerimetreTravaux_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "EvenementChronologie" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "EvenementChronologie_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "BilanDosimetrique" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "edpiMsv" DOUBLE PRECISION,
    "edpoMsv" DOUBLE PRECISION,
    "realiseMsv" DOUBLE PRECISION,
    "deltaMsv" DOUBLE PRECISION,
    "alea" TEXT,
    CONSTRAINT "BilanDosimetrique_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PortiqueRadioprotection" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "nombre" INTEGER NOT NULL,
    "localisation" TEXT,
    "observations" TEXT,
    CONSTRAINT "PortiqueRadioprotection_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "BilanIntervention_affaireId_key" ON "BilanIntervention"("affaireId");
-- CreateIndex
CREATE INDEX "DiffusionRFI_affaireId_idx" ON "DiffusionRFI"("affaireId");
-- CreateIndex
CREATE INDEX "RevisionRFI_affaireId_idx" ON "RevisionRFI"("affaireId");
-- CreateIndex
CREATE INDEX "PerimetreTravaux_affaireId_idx" ON "PerimetreTravaux"("affaireId");
-- CreateIndex
CREATE INDEX "EvenementChronologie_affaireId_idx" ON "EvenementChronologie"("affaireId");
-- CreateIndex
CREATE UNIQUE INDEX "BilanDosimetrique_affaireId_key" ON "BilanDosimetrique"("affaireId");
-- CreateIndex
CREATE INDEX "PortiqueRadioprotection_affaireId_idx" ON "PortiqueRadioprotection"("affaireId");
-- AddForeignKey
ALTER TABLE "BilanIntervention" ADD CONSTRAINT "BilanIntervention_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DiffusionRFI" ADD CONSTRAINT "DiffusionRFI_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RevisionRFI" ADD CONSTRAINT "RevisionRFI_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PerimetreTravaux" ADD CONSTRAINT "PerimetreTravaux_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "EvenementChronologie" ADD CONSTRAINT "EvenementChronologie_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "BilanDosimetrique" ADD CONSTRAINT "BilanDosimetrique_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PortiqueRadioprotection" ADD CONSTRAINT "PortiqueRadioprotection_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
