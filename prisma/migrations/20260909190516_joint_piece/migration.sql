-- AlterTable
ALTER TABLE "Joint" ADD COLUMN     "pieceId" TEXT;

-- AddForeignKey
ALTER TABLE "Joint" ADD CONSTRAINT "Joint_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

