import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";

// Types de fichiers acceptés pour le dépôt direct dans Weldoc (le
// "drive") : documents (PDF) et photos/scans (image). Toute autre
// extension serait probablement une erreur de manipulation.
const TYPES_ACCEPTES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);
const TAILLE_MAX_OCTETS = 20 * 1024 * 1024; // 20 Mo

// POST /api/upload — dépose un fichier directement dans Weldoc (voir le
// cahier des charges, "Stockage : documents, photos, certificats, PV,
// plans, scans") plutôt que d'exiger un lien vers un fichier déjà
// hébergé ailleurs. Stocké sur Vercel Blob (le stockage de fichiers du
// même hébergeur que l'application — voir BLOB_READ_WRITE_TOKEN dans
// .env.example). Renvoie l'URL publique du fichier, à coller dans
// n'importe quel champ "lien vers un document" existant (CCPU, PV,
// habilitation, document justificatif...) — cette route ne décide de
// rien, elle ne fait que stocker le fichier tel quel.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Le dépôt de fichiers n'est pas encore configuré (BLOB_READ_WRITE_TOKEN manquant)." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (!TYPES_ACCEPTES.has(fichier.type)) {
    return NextResponse.json({ error: "Type de fichier non accepté (PDF ou image uniquement)." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo maximum)." }, { status: 400 });
  }

  const blob = await put(`documents/${Date.now()}-${fichier.name}`, fichier, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
