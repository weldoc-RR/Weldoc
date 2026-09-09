-- CreateTable
CREATE TABLE "DocumentExterne" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'Rev 0',
    "titre" TEXT NOT NULL,
    "categorie" TEXT,
    "url" TEXT NOT NULL,
    "dateDocument" TIMESTAMP(3),
    "importeParId" TEXT NOT NULL,
    "dateImport" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valideConclusion" "ConclusionRevuePVExterne",
    "valideCommentaire" TEXT,
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "retiree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentExterne_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "_AffaireToDocumentExterne" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AffaireToDocumentExterne_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateTable
CREATE TABLE "_DocumentExterneToJoint" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DocumentExterneToJoint_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateTable
CREATE TABLE "_DocumentExterneToPhase" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DocumentExterneToPhase_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateTable
CREATE TABLE "_DocumentExterneToFNC" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DocumentExterneToFNC_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateTable
CREATE TABLE "_PersonnelConcerneDocumentExterne" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PersonnelConcerneDocumentExterne_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateTable
CREATE TABLE "_DocumentExterneToOutil" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DocumentExterneToOutil_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateIndex
CREATE INDEX "DocumentExterne_reference_idx" ON "DocumentExterne"("reference");
-- CreateIndex
CREATE INDEX "_AffaireToDocumentExterne_B_index" ON "_AffaireToDocumentExterne"("B");
-- CreateIndex
CREATE INDEX "_DocumentExterneToJoint_B_index" ON "_DocumentExterneToJoint"("B");
-- CreateIndex
CREATE INDEX "_DocumentExterneToPhase_B_index" ON "_DocumentExterneToPhase"("B");
-- CreateIndex
CREATE INDEX "_DocumentExterneToFNC_B_index" ON "_DocumentExterneToFNC"("B");
-- CreateIndex
CREATE INDEX "_PersonnelConcerneDocumentExterne_B_index" ON "_PersonnelConcerneDocumentExterne"("B");
-- CreateIndex
CREATE INDEX "_DocumentExterneToOutil_B_index" ON "_DocumentExterneToOutil"("B");
-- AddForeignKey
ALTER TABLE "DocumentExterne" ADD CONSTRAINT "DocumentExterne_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DocumentExterne" ADD CONSTRAINT "DocumentExterne_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_AffaireToDocumentExterne" ADD CONSTRAINT "_AffaireToDocumentExterne_A_fkey" FOREIGN KEY ("A") REFERENCES "Affaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_AffaireToDocumentExterne" ADD CONSTRAINT "_AffaireToDocumentExterne_B_fkey" FOREIGN KEY ("B") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToJoint" ADD CONSTRAINT "_DocumentExterneToJoint_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToJoint" ADD CONSTRAINT "_DocumentExterneToJoint_B_fkey" FOREIGN KEY ("B") REFERENCES "Joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToPhase" ADD CONSTRAINT "_DocumentExterneToPhase_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToPhase" ADD CONSTRAINT "_DocumentExterneToPhase_B_fkey" FOREIGN KEY ("B") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToFNC" ADD CONSTRAINT "_DocumentExterneToFNC_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToFNC" ADD CONSTRAINT "_DocumentExterneToFNC_B_fkey" FOREIGN KEY ("B") REFERENCES "FNC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_PersonnelConcerneDocumentExterne" ADD CONSTRAINT "_PersonnelConcerneDocumentExterne_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_PersonnelConcerneDocumentExterne" ADD CONSTRAINT "_PersonnelConcerneDocumentExterne_B_fkey" FOREIGN KEY ("B") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToOutil" ADD CONSTRAINT "_DocumentExterneToOutil_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentExterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_DocumentExterneToOutil" ADD CONSTRAINT "_DocumentExterneToOutil_B_fkey" FOREIGN KEY ("B") REFERENCES "Outil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
