// Rapprochement QS/WPS : est-ce qu'une des qualifications soudage d'un
// soudeur couvre le WPS affecté à un joint (procédé, groupe de matériaux,
// épaisseur, diamètre) ? Comme toute vérification de conformité dans
// Weldoc, ceci est un signal d'aide, jamais une décision : le résultat
// n'empêche jamais la création d'un joint, et ne remplace pas la
// vérification par une personne compétente avant soudage (cf. le §3.3.1 et
// les règles d'extension propres à chaque référentiel, non reproduites ici
// — voir l'avertissement sur les normes protégées dans
// src/lib/tolerances.ts). La comparaison ne porte que sur les champs
// structurés (procede, groupeMateriaux, épaisseur/diamètre) : un champ
// laissé vide d'un côté ou de l'autre n'est ni une réussite ni un échec,
// juste une donnée qu'on ne peut pas vérifier.
export interface QualificationPourVerificationQS {
  id: string;
  procede: string | null;
  groupeMateriaux: string | null;
  epaisseurMinMm: number | null;
  epaisseurMaxMm: number | null;
  diametreMinMm: number | null;
  diametreMaxMm: number | null;
}

export interface WpsPourVerificationQS {
  procede: string;
  groupeMateriaux: string | null;
  epaisseurMinMm: number | null;
  epaisseurMaxMm: number | null;
  diametreMinMm: number | null;
  diametreMaxMm: number | null;
}

export type StatutVerificationQS = "COUVERT" | "NON_COUVERT" | "DONNEES_INSUFFISANTES" | "AUCUNE_QUALIFICATION";

export interface ResultatVerificationQS {
  statut: StatutVerificationQS;
  qualificationCouvranteId: string | null;
  // Écarts constatés sur la qualification la plus proche (vide si COUVERT
  // ou si aucune donnée comparable n'existe).
  ecarts: string[];
}

function normalise(valeur: string | null): string | null {
  const v = valeur?.trim().toLowerCase();
  return v ? v : null;
}

function contient(qMin: number | null, qMax: number | null, wMin: number | null, wMax: number | null): boolean | null {
  if (qMin === null || qMax === null || wMin === null || wMax === null) return null;
  return qMin <= wMin && qMax >= wMax;
}

function comparerQualification(q: QualificationPourVerificationQS, wps: WpsPourVerificationQS): string[] {
  const ecarts: string[] = [];

  const procedeQ = normalise(q.procede);
  const procedeW = normalise(wps.procede);
  if (procedeQ && procedeW && procedeQ !== procedeW) {
    ecarts.push(`procédé qualifié "${q.procede}" ≠ procédé du WPS "${wps.procede}"`);
  }

  const groupeQ = normalise(q.groupeMateriaux);
  const groupeW = normalise(wps.groupeMateriaux);
  if (groupeQ && groupeW && groupeQ !== groupeW) {
    ecarts.push(`groupe de matériaux qualifié "${q.groupeMateriaux}" ≠ groupe du WPS "${wps.groupeMateriaux}"`);
  }

  const epaisseurOk = contient(q.epaisseurMinMm, q.epaisseurMaxMm, wps.epaisseurMinMm, wps.epaisseurMaxMm);
  if (epaisseurOk === false) {
    ecarts.push(
      `épaisseur du WPS (${wps.epaisseurMinMm}–${wps.epaisseurMaxMm} mm) hors du domaine qualifié (${q.epaisseurMinMm}–${q.epaisseurMaxMm} mm)`
    );
  }

  const diametreOk = contient(q.diametreMinMm, q.diametreMaxMm, wps.diametreMinMm, wps.diametreMaxMm);
  if (diametreOk === false) {
    ecarts.push(
      `diamètre du WPS (${wps.diametreMinMm}–${wps.diametreMaxMm} mm) hors du domaine qualifié (${q.diametreMinMm}–${q.diametreMaxMm} mm)`
    );
  }

  return ecarts;
}

export function verifierQS(
  qualifications: QualificationPourVerificationQS[],
  wps: WpsPourVerificationQS
): ResultatVerificationQS {
  if (qualifications.length === 0) {
    return { statut: "AUCUNE_QUALIFICATION", qualificationCouvranteId: null, ecarts: [] };
  }

  let auMoinsUneComparaisonUtile = false;
  let meilleureCandidate: { id: string; ecarts: string[] } | null = null;

  for (const q of qualifications) {
    const ecarts = comparerQualification(q, wps);
    const aDesDonneesComparables =
      (normalise(q.procede) && normalise(wps.procede)) ||
      (normalise(q.groupeMateriaux) && normalise(wps.groupeMateriaux)) ||
      contient(q.epaisseurMinMm, q.epaisseurMaxMm, wps.epaisseurMinMm, wps.epaisseurMaxMm) !== null ||
      contient(q.diametreMinMm, q.diametreMaxMm, wps.diametreMinMm, wps.diametreMaxMm) !== null;
    if (aDesDonneesComparables) auMoinsUneComparaisonUtile = true;

    if (ecarts.length === 0 && aDesDonneesComparables) {
      return { statut: "COUVERT", qualificationCouvranteId: q.id, ecarts: [] };
    }
    if (!meilleureCandidate || ecarts.length < meilleureCandidate.ecarts.length) {
      meilleureCandidate = { id: q.id, ecarts };
    }
  }

  if (!auMoinsUneComparaisonUtile) {
    return { statut: "DONNEES_INSUFFISANTES", qualificationCouvranteId: null, ecarts: [] };
  }

  return {
    statut: "NON_COUVERT",
    qualificationCouvranteId: null,
    ecarts: meilleureCandidate?.ecarts ?? [],
  };
}
