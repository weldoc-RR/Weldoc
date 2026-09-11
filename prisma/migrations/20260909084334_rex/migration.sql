-- CreateTable
CREATE TABLE "FicheREX" (
    "id" TEXT NOT NULL,
    "fncId" TEXT NOT NULL,
    "typeProbleme" TEXT NOT NULL,
    "origine" TEXT,
    "cause" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "resultat" TEXT,
    "redacteurId" TEXT NOT NULL,
    "dateRedaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FicheREX_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "FicheREX_fncId_key" ON "FicheREX"("fncId");
-- CreateIndex
CREATE INDEX "FicheREX_typeProbleme_idx" ON "FicheREX"("typeProbleme");
-- AddForeignKey
ALTER TABLE "FicheREX" ADD CONSTRAINT "FicheREX_fncId_fkey" FOREIGN KEY ("fncId") REFERENCES "FNC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "FicheREX" ADD CONSTRAINT "FicheREX_redacteurId_fkey" FOREIGN KEY ("redacteurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
