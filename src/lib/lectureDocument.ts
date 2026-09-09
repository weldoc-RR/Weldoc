import Anthropic from "@anthropic-ai/sdk";

// Lecture automatique de document (voir le cahier des charges,
// "CONSOMMABLES" : "reconnaissance de caractères pour proposer
// automatiquement... le contrôleur valide, la photo originale est
// conservée comme preuve" — même principe appliqué ici aux
// qualifications/habilitations plutôt qu'aux étiquettes de consommables).
// L'IA ne décide jamais seule (PRINCIPE DE CONCEPTION) : cette fonction ne
// fait que PROPOSER des valeurs à relire et corriger avant enregistrement,
// via le même formulaire et la même route API que la saisie manuelle —
// aucune écriture en base ne se fait ici.

export type TypeDocumentLisible = "QUALIFICATION" | "HABILITATION";

export interface ChampsExtraits {
  reference: string | null;
  intitule: string | null;
  norme: string | null;
  dateObtention: string | null; // YYYY-MM-DD
  dateExpiration: string | null; // YYYY-MM-DD
  organisme: string | null;
}

const CHAMPS_PAR_TYPE: Record<TypeDocumentLisible, string[]> = {
  // "intitule" n'a pas de sens pour une qualification (elle a une
  // référence + une norme) ; "norme" n'a pas de sens pour une
  // habilitation générique — chaque type ne demande que ses champs
  // pertinents, jamais les deux à la fois.
  QUALIFICATION: ["reference", "norme", "dateObtention", "dateExpiration", "organisme"],
  HABILITATION: ["intitule", "reference", "dateObtention", "dateExpiration", "organisme"],
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
    "la date d'obtention, la date d'expiration si indiquée, et l'organisme délivreur.",
};

const LIBELLES_CHAMPS: Record<string, string> = {
  reference: "Numéro ou référence du certificat, tel qu'écrit sur le document. null si absent.",
  intitule: "Intitulé exact de l'habilitation. null si absent.",
  norme: "Code de la norme appliquée (ex. \"EN ISO 9606-1\"). null si absent.",
  dateObtention: "Date d'obtention/de passation, au format YYYY-MM-DD. null si absente ou illisible.",
  dateExpiration: "Date d'expiration/de validité, au format YYYY-MM-DD. null si absente ou illisible.",
  organisme: "Organisme ou personne ayant examiné/délivré le document. null si absent.",
};

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
export async function lireDocument(documentUrl: string, type: TypeDocumentLisible): Promise<ChampsExtraits> {
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
          properties: Object.fromEntries(champs.map((c) => [c, { type: ["string", "null"], description: LIBELLES_CHAMPS[c] }])),
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

  const brut = appelOutil.input as Record<string, string | null>;
  return {
    reference: brut.reference ?? null,
    intitule: brut.intitule ?? null,
    norme: brut.norme ?? null,
    dateObtention: brut.dateObtention ?? null,
    dateExpiration: brut.dateExpiration ?? null,
    organisme: brut.organisme ?? null,
  };
}
