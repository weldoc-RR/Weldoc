-- CreateTable
CREATE TABLE "NoteRex" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteRex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteRex_affaireId_idx" ON "NoteRex"("affaireId");

-- AddForeignKey
ALTER TABLE "NoteRex" ADD CONSTRAINT "NoteRex_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteRex" ADD CONSTRAINT "NoteRex_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

