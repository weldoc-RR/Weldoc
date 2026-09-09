-- CreateTable
CREATE TABLE "ScanTqc" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "dateScan" TIMESTAMP(3) NOT NULL,
    "operateurId" TEXT NOT NULL,
    "logiciel" TEXT,
    "versionLogiciel" TEXT,
    "fichierSourceUrl" TEXT NOT NULL,
    "fichierGenereUrl" TEXT,
    "isoResultantUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanTqc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JointToScanTqc" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JointToScanTqc_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ScanTqc_affaireId_idx" ON "ScanTqc"("affaireId");

-- CreateIndex
CREATE INDEX "_JointToScanTqc_B_index" ON "_JointToScanTqc"("B");

-- AddForeignKey
ALTER TABLE "ScanTqc" ADD CONSTRAINT "ScanTqc_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanTqc" ADD CONSTRAINT "ScanTqc_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JointToScanTqc" ADD CONSTRAINT "_JointToScanTqc_A_fkey" FOREIGN KEY ("A") REFERENCES "Joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JointToScanTqc" ADD CONSTRAINT "_JointToScanTqc_B_fkey" FOREIGN KEY ("B") REFERENCES "ScanTqc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

