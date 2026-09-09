import Anthropic from "@anthropic-ai/sdk";

// Lecture automatique de document (voir le cahier des charges,
// "CONSOMMABLES" : "reconnaissance de caractères pour proposer
// automatiquement... le contrôleur valide, la photo originale est
// conservée comme preuve" — même principe appliqué ici aux
// qualifications/habilitations et aux matières/CCPU).
// L'IA ne décide jamais seule (PRINCIPE DE CONCEPTION) : cette fonction ne
// fait que PROPOSER des valeurs à relire et corriger avant enregistrement,
// via le même formulaire et la même route API que la saisie manuelle —
// aucune écriture en base ne se fait ici.

export type TypeDocumentLisible = "QUALIFICATION" | "HABILITATION" | "MATIERE";

export interface ChampsExtraits {
  reference: string | null;
  intitule: string | null;
  norme: string | null;
  dateObtention: string | null; // YYYY-MM-DD
  dateExpiration: string | null; // YYYY-MM-DD
  organisme: string | null;
  fournisseur: string | null;
  designation: string | null;
  normeProduit: string | null;
  nuance: string | null;
  diametre: number | null;
  epaisseur: number | null;
  numeroCoulee: string | null;
  numeroLot: string | null;
}

// Chaque type ne demande que ses champs pertinents, jamais tous à la
// fois : "intitule" n'a pas de sens pour une qualification, "nuance" n'a
// pas de sens pour une habilitation, etc.
const CHAMPS_PAR_TYPE: Record<TypeDocumentLisible, (keyof ChampsExtraits)[]> = {
  QUALIFICATION: ["reference", "norme", "dateObtention", "dateExpiration", "organisme"],
  HABILITATION: ["intitule", "reference", "dateObtention", "dateExpiration"],
  MATIERE: ["fournisseur", "designation", "normeProduit", "nuance", "diametre", "epaisseur", "numeroCoulee", "numeroLot"],
};

const CONSIGNE_PAR_TYPE: Record<TypeDocumentLisible, string> = {
  QUALIFICATION:
    "Ce document est un certificat de qualification de soudage ou de contrôle non destructif (CND). " +
    "Identifie : le numéro/référence du certificat, la norme appliquée (ex. \"EN ISO 9606-1\"), " +
    "la date d'obtention/de passation, la date d'expiration/de validité si indiquée, et l'organisme " +
    "ou la personne ayant examiné/délivré le certificat.",
  HABILITATION:
    "Ce document est un certificat d'habilitation (électrique, travail en hauteur, échafaudage, " +
    "radioprotection...). Identifie : l'intitulé exact de l'habilitation, sa référence/numéro si indiqué, " +
    "la date d'obtention, la date d'expiration si indiquée.",
  MATIERE:
    "Ce document est un CCPU (certificat de contrôle des produits utilisés) ou un certificat matière " +
    "(type 3.1/3.2) accompagnant un tube, une tôle ou un composant. Identifie : le fournisseur/fabricant, " +
    "la désignation du produit (ex. \"Tube acier carbone\"), la norme produit (ex. \"EN 10216-2\"), la nuance " +
    "d'acier (ex. \"P235GH\"), le diamètre et l'épaisseur nominaux en mm si indiqués, le numéro de coulée " +
    "(heat/cast number) et le numéro de lot si distinct de la coulée.",
};

const LIBELLES_CHAMPS: Record<keyof ChampsExtraits, string> = {
  reference: "Numéro ou référence du certificat, tel qu'écrit sur le document. null si absent.",
  intitule: "Intitulé exact de l'habilitation. null si absent.",
  norme: "Code de la norme appliquée (ex. \"EN ISO 9606-1\"). null si absent.",
  dateObtention: "Date d'obtention/de passation, au format YYYY-MM-DD. null si absente ou illisible.",
  dateExpiration: "Date d'expiration/de validité, au format YYYY-MM-DD. null si absente ou illisible.",
  organisme: "Organisme ou personne ayant examiné/délivré le document. null si absent.",
  fournisseur: "Fournisseur ou fabricant du produit. null si absent.",
  designation: "Désignation du produit (ex. \"Tube acier carbone\"). null si absente.",
  normeProduit: "Norme produit (ex. \"EN 10216-2\"). null si absente.",
  nuance: "Nuance du matériau (ex. \"P235GH\"). null si absente.",
  diametre: "Diamètre nominal en mm, un nombre. null si absent ou illisible.",
  epaisseur: "Épaisseur nominale en mm, un nombre. null si absente ou illisible.",
  numeroCoulee: "Numéro de coulée (heat/cast number), tel qu'écrit sur le document. null si absent.",
  numeroLot: "Numéro de lot, si distinct du numéro de coulée. null si absent.",
};

const CHAMPS_NUMERIQUES = new Set<keyof ChampsExtraits>(["diametre", "epaisseur"]);

function typeMedia(contentType: string): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  if (contentType.includes("pdf")) return "application/pdf";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "image/jpeg";
  if (contentType.includes("png")) return "image/png";
  if (contentType.includes("webp")) return "image/webp";
  return null;
}

// Lit un document déjà déposé (voir POST /api/upload) et en propose une
// lecture structurée. Ne lève une erreur que sur un vrai problème
// technique (document illisible, clé absente...) — un champ non trouvé
// sur le document lui-même revient simplement à `null`, à compléter à la
// main comme aujourd'hui.
export async function lireDocument(documentUrl: string, type: TypeDocumentLisible): Promise<Partial<ChampsExtraits>> {
  const reponseFichier = await fetch(documentUrl);
  if (!reponseFichier.ok) {
    throw new Error("Impossible de récupérer le document déposé.");
  }
  const contentType = typeMedia(reponseFichier.headers.get("content-type") ?? "");
  if (!contentType) {
    throw new Error("Format de document non reconnu pour la lecture automatique (PDF ou image attendu).");
  }
  const donnees = Buffer.from(await reponseFichier.arrayBuffer()).toString("base64");

  const champs = CHAMPS_PAR_TYPE[type];
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    tools: [
      {
        name: "extraire_champs",
        description: "Renvoie les champs identifiés sur le document justificatif.",
        input_schema: {
          type: "object",
          properties: Object.fromEntries(
            champs.map((c) => [c, { type: [CHAMPS_NUMERIQUES.has(c) ? "number" : "string", "null"], description: LIBELLES_CHAMPS[c] }])
          ),
          required: champs,
          additionalProperties: false,
        },
        strict: true,
      },
    ],
    tool_choice: { type: "tool", name: "extraire_champs" },
    messages: [
      {
        role: "user",
        content: [
          contentType === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: donnees } }
            : { type: "image", source: { type: "base64", media_type: contentType, data: donnees } },
          { type: "text", text: CONSIGNE_PAR_TYPE[type] },
        ],
      },
    ],
  });

  const appelOutil = message.content.find((bloc) => bloc.type === "tool_use");
  if (!appelOutil || appelOutil.type !== "tool_use") {
    throw new Error("La lecture automatique n'a renvoyé aucun résultat exploitable.");
  }

  const brut = appelOutil.input as Record<string, string | number | null>;
  const resultat: Partial<ChampsExtraits> = {};
  for (const c of champs) {
    resultat[c] = (brut[c] ?? null) as never;
  }
  return resultat;
}
