-- CreateEnum
CREATE TYPE "NiveauDecision" AS ENUM ('NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3');

-- CreateEnum
CREATE TYPE "TypeQualification" AS ENUM ('SOUDAGE', 'CND');

-- CreateEnum
CREATE TYPE "StatutQualification" AS ENUM ('VALIDE', 'BIENTOT_ECHEANCE', 'EXPIRE', 'EN_RENOUVELLEMENT', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "TypeEvenementQualification" AS ENUM ('OBTENTION', 'RECONDUCTION_PROPOSEE', 'RECONDUCTION_VALIDEE', 'SUSPENSION', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "StatutPhase" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINEE', 'NON_APPLICABLE');

-- CreateEnum
CREATE TYPE "StatutOutil" AS ENUM ('VALIDE', 'EXPIRE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "ResultatConformite" AS ENUM ('CONFORME', 'HORS_TOLERANCE', 'A_VERIFIER');

-- CreateEnum
CREATE TYPE "StatutFNC" AS ENUM ('DETECTION', 'ANALYSE', 'ACTION_CORRECTIVE', 'CONTROLE', 'VALIDATION', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "ImpactFNC" AS ENUM ('BLOQUANTE', 'NON_BLOQUANTE', 'REGLEMENTAIREMENT_SENSIBLE');

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "societe" TEXT NOT NULL,
    "niveau" "NiveauDecision" NOT NULL,
    "qrCodeValeur" TEXT NOT NULL,
    "pinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelFonction" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "fonction" TEXT NOT NULL,

    CONSTRAINT "PersonnelFonction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "type" "TypeQualification" NOT NULL,
    "reference" TEXT NOT NULL,
    "norme" TEXT NOT NULL,
    "procede" TEXT,
    "materiaux" TEXT,
    "domaineValidite" TEXT,
    "dateObtention" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "statut" "StatutQualification" NOT NULL DEFAULT 'VALIDE',
    "certificatUrl" TEXT,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationEvenement" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "type" "TypeEvenementQualification" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preuveJointIds" TEXT[],
    "valideParId" TEXT,
    "commentaire" TEXT,

    CONSTRAINT "QualificationEvenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "publieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAcceptation" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "chartVersionId" TEXT NOT NULL,
    "dateAcceptation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartAcceptation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affaire" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "projet" TEXT NOT NULL,
    "chantier" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "responsableId" TEXT,
    "chargeAffairesId" TEXT,
    "coordinateurSoudageId" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "cahierDesChargesUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referentiel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "domaine" TEXT NOT NULL,
    "version" TEXT,

    CONSTRAINT "Referentiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffaireReferentiel" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "referentielId" TEXT NOT NULL,

    CONSTRAINT "AffaireReferentiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "statut" "StatutPhase" NOT NULL DEFAULT 'A_FAIRE',
    "justificationNA" TEXT,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matiere" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "normeProduit" TEXT NOT NULL,
    "nuance" TEXT NOT NULL,
    "diametre" DOUBLE PRECISION,
    "epaisseur" DOUBLE PRECISION,
    "finition" TEXT,
    "numeroCoulee" TEXT NOT NULL,
    "numeroLot" TEXT,
    "ccpuDocumentUrl" TEXT,
    "certificatUrl" TEXT,

    CONSTRAINT "Matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Joint" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "ligne" TEXT,
    "spool" TEXT,
    "typeJoint" TEXT,
    "dn" TEXT,
    "diametre" DOUBLE PRECISION,
    "epaisseur" DOUBLE PRECISION,
    "matiereId" TEXT,
    "wpsReference" TEXT,
    "qmosReference" TEXT,
    "qsReference" TEXT,
    "soudeurId" TEXT,
    "consommableLot" TEXT,
    "jointParentId" TEXT,
    "indiceReparation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Joint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheTechniqueSoudage" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "procede" TEXT,
    "preechauffageC" DOUBLE PRECISION,
    "temperatureInterpasses" DOUBLE PRECISION,
    "postchauffageC" DOUBLE PRECISION,
    "tensionV" DOUBLE PRECISION,
    "intensiteA" DOUBLE PRECISION,
    "vitesseMmMin" DOUBLE PRECISION,
    "nombrePasses" INTEGER,
    "tempsMin" DOUBLE PRECISION,
    "observations" TEXT,
    "photosUrls" TEXT[],
    "signatureId" TEXT,

    CONSTRAINT "FicheTechniqueSoudage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outil" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fabricant" TEXT,
    "numeroSerie" TEXT,
    "dateVerification" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "statut" "StatutOutil" NOT NULL DEFAULT 'VALIDE',
    "certificatUrl" TEXT,
    "qrCodeValeur" TEXT NOT NULL,

    CONSTRAINT "Outil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleDimensionnel" (
    "id" TEXT NOT NULL,
    "jointId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "outilId" TEXT,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mesures" JSONB NOT NULL,
    "criteresAppliques" JSONB NOT NULL,
    "resultat" "ResultatConformite" NOT NULL,
    "signatureId" TEXT,

    CONSTRAINT "ControleDimensionnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FNC" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "jointId" TEXT,
    "controleOrigineId" TEXT,
    "description" TEXT NOT NULL,
    "impact" "ImpactFNC" NOT NULL,
    "statut" "StatutFNC" NOT NULL DEFAULT 'DETECTION',
    "actionCorrective" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCloture" TIMESTAMP(3),
    "valideeParId" TEXT,

    CONSTRAINT "FNC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionDocument" TEXT NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "ancienneValeur" JSONB,
    "nouvelleValeur" JSONB,
    "motif" TEXT,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_matricule_key" ON "Personnel"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_qrCodeValeur_key" ON "Personnel"("qrCodeValeur");

-- CreateIndex
CREATE INDEX "Personnel_societe_idx" ON "Personnel"("societe");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelFonction_personnelId_fonction_key" ON "PersonnelFonction"("personnelId", "fonction");

-- CreateIndex
CREATE INDEX "Qualification_personnelId_type_idx" ON "Qualification"("personnelId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ChartVersion_version_key" ON "ChartVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "ChartAcceptation_personnelId_chartVersionId_key" ON "ChartAcceptation"("personnelId", "chartVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Affaire_numero_key" ON "Affaire"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Referentiel_code_key" ON "Referentiel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AffaireReferentiel_affaireId_referentielId_key" ON "AffaireReferentiel"("affaireId", "referentielId");

-- CreateIndex
CREATE INDEX "Matiere_numeroCoulee_idx" ON "Matiere"("numeroCoulee");

-- CreateIndex
CREATE INDEX "Joint_affaireId_idx" ON "Joint"("affaireId");

-- CreateIndex
CREATE UNIQUE INDEX "Joint_affaireId_numero_indiceReparation_key" ON "Joint"("affaireId", "numero", "indiceReparation");

-- CreateIndex
CREATE UNIQUE INDEX "FicheTechniqueSoudage_jointId_key" ON "FicheTechniqueSoudage"("jointId");

-- CreateIndex
CREATE UNIQUE INDEX "Outil_reference_key" ON "Outil"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Outil_qrCodeValeur_key" ON "Outil"("qrCodeValeur");

-- CreateIndex
CREATE UNIQUE INDEX "FNC_reference_key" ON "FNC"("reference");

-- CreateIndex
CREATE INDEX "Signature_documentType_documentId_idx" ON "Signature"("documentType", "documentId");

-- AddForeignKey
ALTER TABLE "PersonnelFonction" ADD CONSTRAINT "PersonnelFonction_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationEvenement" ADD CONSTRAINT "QualificationEvenement_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAcceptation" ADD CONSTRAINT "ChartAcceptation_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAcceptation" ADD CONSTRAINT "ChartAcceptation_chartVersionId_fkey" FOREIGN KEY ("chartVersionId") REFERENCES "ChartVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffaireReferentiel" ADD CONSTRAINT "AffaireReferentiel_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffaireReferentiel" ADD CONSTRAINT "AffaireReferentiel_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_soudeurId_fkey" FOREIGN KEY ("soudeurId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_jointParentId_fkey" FOREIGN KEY ("jointParentId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheTechniqueSoudage" ADD CONSTRAINT "FicheTechniqueSoudage_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleDimensionnel" ADD CONSTRAINT "ControleDimensionnel_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleDimensionnel" ADD CONSTRAINT "ControleDimensionnel_controleurId_fkey" FOREIGN KEY ("controleurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleDimensionnel" ADD CONSTRAINT "ControleDimensionnel_outilId_fkey" FOREIGN KEY ("outilId") REFERENCES "Outil"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_jointId_fkey" FOREIGN KEY ("jointId") REFERENCES "Joint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FNC" ADD CONSTRAINT "FNC_controleOrigineId_fkey" FOREIGN KEY ("controleOrigineId") REFERENCES "ControleDimensionnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

