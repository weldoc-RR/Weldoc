// Envoi d'email via l'API REST de Resend (https://resend.com), sans
// dépendance supplémentaire. Nécessite deux variables d'environnement :
// - RESEND_API_KEY : la clé API de votre compte Resend
// - ALERTES_EMAIL_FROM : l'adresse d'expédition (doit appartenir à un
//   domaine vérifié dans Resend, sinon l'envoi échoue)
// Tant que RESEND_API_KEY n'est pas définie, envoyerEmail() ne fait rien et
// le signale clairement plutôt que d'échouer silencieusement.
export async function envoyerEmail(params: {
  destinataires: string[];
  sujet: string;
  texte: string;
  html: string;
}): Promise<{ envoye: boolean; motif?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTES_EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      envoye: false,
      motif:
        "Service d'envoi d'email non configuré (variables d'environnement RESEND_API_KEY et/ou ALERTES_EMAIL_FROM manquantes).",
    };
  }

  if (params.destinataires.length === 0) {
    return { envoye: false, motif: "Aucun destinataire actif enregistré (voir /api/destinataires-alertes)." };
  }

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.destinataires,
      subject: params.sujet,
      text: params.texte,
      html: params.html,
    }),
  });

  if (!reponse.ok) {
    const detail = await reponse.text();
    return { envoye: false, motif: `Échec de l'envoi (${reponse.status}) : ${detail}` };
  }

  return { envoye: true };
}
