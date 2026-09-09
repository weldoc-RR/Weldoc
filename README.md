# Weldoc — Squelette technique (v0.1)

Ceci est un **premier squelette réel** du logiciel Weldoc décrit dans le cahier
des charges. Il ne couvre pas encore les ~50 modules prévus, mais il fait
tourner **une verticale complète de bout en bout** avec de vraies données, pas
une maquette :

```
Créer une affaire → créer un joint (numérotation auto M800, M801...)
   → réaliser un contrôle dimensionnel → le moteur détermine les critères
   applicables et évalue la conformité → si hors tolérance : une FNC est
   créée automatiquement et liée au joint et au contrôle.
```

## Contenu

- `prisma/schema.prisma` — modèle de données complet du socle : personnel,
  qualifications (avec historique jamais écrasé), affaires, référentiels,
  séquences/phases, matières/CCPU, joints (avec gestion des réparations
  M800 → M800 R1 → M800 R2), fiches de suivi soudage, métrologie/outillage,
  contrôles dimensionnels, FNC, signatures (QR + PIN), audit trail.
- `src/lib/tolerances.ts` — moteur de détermination des critères
  dimensionnels par formule. Contient désormais trois règles réelles pour
  l'**EN 10216-2:2013+A1:2019** (tubes sans soudure), transmises par un
  utilisateur détenant l'accès licencié à la norme : Tableau 7 (diamètre/
  épaisseur nominale), Tableau 9 (diamètre/épaisseur minimale garantie
  Tmin) et Tableau 11 (tubes finis à froid). **Important sur ce qui est
  reproduit ou non** : le code encode uniquement la *règle de calcul*
  (seuils numériques traduits en fonctions, avec mes propres noms de
  variables) — jamais le texte de la norme (légendes de tableau, notes,
  mise en page, en-têtes AFNOR). C'est la distinction faite ici entre
  "implémenter la règle technique qui en découle" (autorisé, pratique
  courante des logiciels techniques) et "republier le document" (jamais
  fait, et aucune image/capture de la norme n'est stockée dans le dépôt).
  Simplification assumée et documentée dans le code : la tolérance locale
  supplémentaire (+5 % sur l'épaisseur maxi, D ≥ 355,6 mm, mesure
  ponctuelle) n'est pas appliquée, seul le cas général l'est. "EXEMPLE-DEMO"
  reste disponible comme norme placeholder pour toute norme pas encore
  configurée — le message d'erreur du contrôle le rappelle.
- **Bibliothèque dimensionnelle** (voir le cahier des charges) — produits
  normalisés (tubes, tôles, raccords, brides...) enregistrés une fois par
  une personne compétente, avec leurs critères min/maxi déjà déterminés
  depuis la norme réelle (`ProduitDimensionnel`, jamais recalculés par
  Weldoc, contrairement au moteur formule ci-dessus). Même principe de
  versionnage que WPS/QMOS/ProcedureInterne/DocumentExterne
  (`annoterStatutProcedures` réutilisée telle quelle).
  - `GET`/`POST`/`PATCH /api/produits-dimensionnels` — liste, création
    (niveau 2), retrait/réactivation. Section "Bibliothèque dimensionnelle"
    sur `/procedures`.
  - `POST /api/controles-dimensionnels` accepte maintenant un
    `produitDimensionnelId` optionnel : si fourni, ses critères min/maxi
    font foi (au lieu de `determinerCriteres`) et sont copiés dans
    `criteresAppliques` comme avant (rien n'est recalculé après coup). Le
    formulaire "+ DIM" sur `/joints` propose de choisir un produit de la
    bibliothèque, qui préremplit norme/diamètre/épaisseur — la saisie
    manuelle reste possible tant que la bibliothèque ne couvre pas encore
    tout.
- **Tolérances automatiques depuis le CCPU** — jusqu'ici il n'existait
  aucun écran pour réceptionner une matière (`POST /api/matieres` existait
  mais restait inaccessible en pratique). Bouton "+ Réceptionner une
  matière (CCPU)" sur `/joints` (`ajouter-matiere.tsx`) : fournisseur,
  norme produit, nuance, diamètre/épaisseur nominaux, coulée/lot,
  liens CCPU/certificat — saisis une seule fois à la réception. Dès qu'un
  joint est relié à cette matière (`Joint.matiereId`, déjà existant), le
  formulaire "+ DIM" du contrôle dimensionnel préremplit automatiquement
  norme/diamètre/épaisseur depuis elle (modifiable si besoin) : si la
  norme produit reprend exactement un intitulé reconnu par
  `src/lib/tolerances.ts` (ex. "EN 10216-2 (T nominale)"), les critères
  applicables se déterminent alors sans aucune ressaisie, du début de
  l'affaire jusqu'au contrôle.
  - **Retrouver une matière par son numéro de coulée/lot** : sur
    `/joints`, le formulaire "Créer un joint" propose maintenant
    `RechercherMatiere` (`GET /api/matieres?affaireId=...&recherche=...`,
    recherche insensible à la casse sur le numéro de coulée OU le numéro
    de lot, sans que l'intervenant ait besoin de savoir lequel des deux
    c'est) — sur le chantier, il tape juste le numéro lu sur
    l'étiquette de la matière et retrouve directement la matière déjà
    réceptionnée avec son CCPU et son certificat, plutôt que de chercher
    dans la liste déroulante. Recherche limitée à l'affaire en cours
    (une matière reste réceptionnée pour une affaire précise). La liste
    déroulante reste disponible juste en dessous.
  - **Lecture automatique du CCPU/certificat** (voir "Lecture automatique
    des documents déposés" ci-dessous) : `LectureAutomatique` avec
    `type="MATIERE"` sur `AjouterMatiere` — propose fournisseur,
    désignation, norme produit, nuance, diamètre, épaisseur, numéro de
    coulée et numéro de lot à partir du CCPU déposé, à vérifier avant
    d'enregistrer.
  - **Vérification automatique de la conformité à la réception** — Weldoc
    compare désormais chaque matière reçue à ce qui était commandé/prévu
    pour l'affaire, plutôt que de laisser la réception sans aucun contrôle
    croisé. Nouveau modèle `MatierePrevue` (`schema.prisma`) : norme
    produit, nuance, diamètre/épaisseur, quantité prévue — saisi une seule
    fois par l'encadrement via "+ Déclarer une matière prévue pour une
    affaire" sur `/joints` (`declarer-matiere-prevue.tsx`,
    `GET`/`POST /api/matieres-prevues`, niveau 2 minimum). À chaque
    `POST /api/matieres`, `src/lib/conformiteMatiere.ts` compare la
    matière reçue à ce qui est déclaré pour l'affaire : norme/nuance
    différentes de tout ce qui est prévu, ou diamètre/épaisseur différents
    de la matière prévue correspondante → alerte. Même principe que la
    proposition d'affectation adaptée : **ça ne bloque jamais** la
    réception, l'alerte est simplement affichée (`AjouterMatiere`) et
    tracée dans l'audit trail si la réception est enregistrée malgré
    l'alerte ; la décision reste humaine. Et tant qu'aucune matière prévue
    n'a été déclarée pour une affaire, aucune alerte n'est levée (comme
    les autorisations de signature : le contrôle ne devient actif que si
    l'entreprise l'a configuré).
- `src/app/api/` — points d'entrée de l'application :
  - `POST /api/personnel` — créer une fiche personne minimale (identité + niveau)
  - `POST /api/auth/comptes` — créer le compte de connexion d'une personne
    (le tout premier compte de l'entreprise s'amorce librement ; les suivants
    exigent d'être créés par une personne de niveau 3)
  - `POST /api/auth/login` — connexion (matricule + mot de passe)
  - `POST /api/auth/login-qr` — connexion (matricule ou QR + code PIN,
    voir `src/lib/signature.ts` ci-dessous) — même session que ci-dessus
  - `POST /api/auth/logout` — déconnexion (révoque la session côté serveur)
  - `GET /api/auth/me` — utilisateur actuellement connecté
  - `POST /api/affaires` — créer une affaire (authentification requise) ;
    peut préciser le responsable, le chargé d'affaires, le coordinateur
    soudage. Crée aussi automatiquement les 5 séquences par défaut du
    dossier de fabrication (prise en charge → préparation → soudage et
    contrôles → remise en conformité/finalisation → vérification finale).
    `typeRealisation` vaut `CHANTIER` (défaut) ou `ATELIER` — dans ce
    second cas, `chantier`/`site` (qui n'ont pas forcément de sens pour une
    fabrication en atelier) restent facultatifs
  - `POST /api/pieces` — prise en charge d'une pièce en atelier (référence,
    désignation, photos des repères présents dessus comme preuve).
    Contrairement aux joints d'un chantier, une pièce peut être ajoutée à
    tout moment, au fil de l'eau, pas seulement planifiée à l'avance
  - `PATCH /api/pieces` — fait avancer le statut d'une pièce (prise en
    charge → en fabrication → terminée → expédiée), pour un suivi de
    traçabilité tout au long de l'activité
  - `PATCH /api/affaires` — modifier ces rôles après coup (niveau 2
    minimum) ; ils alimentent l'organigramme (voir plus bas)
  - `POST /api/sequences`, `POST /api/phases` — ajouter une séquence
    au-delà des 5 par défaut, ou une phase à une séquence (niveau 2
    minimum)
  - `PATCH /api/phases` — faire avancer une phase. Passer en EN_COURS ou
    TERMINEE est refusé si une séquence précédente de la même affaire
    n'est pas terminée (sauf dérogation accordée par une demande de
    modification de séquencement acceptée, voir plus bas) ; passer en
    NON_APPLICABLE exige une justification
  - `POST /api/phases/signer` — signature groupée de phases : l'exécutant
    coche sur `/avancement/[id]` les phases qu'il vient de réaliser, puis
    s'identifie une seule fois (QR/matricule + code PIN, même parcours que
    `src/lib/signature.ts` : identification → PIN → charte acceptée →
    contrôle des droits) — ça vaut signature pour chacune des phases
    cochées et les passe TERMINEE. Vérifie séquencement et points
    réglementaires bloquants pour chaque phase AVANT de signer quoi que ce
    soit : soit toutes les phases cochées sont signées, soit aucune ne
    l'est. Une signature par phase (`Phase.signatureId`), mais un seul PIN
    saisi pour tout le lot.
  - `POST /api/demandes-sequencement` — demande de modification du
    séquencement par le terrain (phases concernées, motif, urgence,
    photo/document). **Interface** (jusqu'ici API seule, sans aucun
    écran) : section "Demandes de modification de séquencement" sur
    `/avancement/[id]` (`demandes-sequencement.tsx`) — cases à cocher
    pour les phases concernées, motif, urgence, dépôt direct de la
    photo/du document (`FileUpload`).
  - `POST /api/demandes-sequencement/[id]/decision` — accepte/refuse/
    demande une modification, réservé au niveau 3, tracé dans l'audit
    trail ; une demande ACCEPTEE lève le blocage d'ordre précisément pour
    les phases qu'elle liste. Décision prise directement sur la même
    section (sélecteur + commentaire + conditions, visible seulement au
    niveau 3), avec l'historique des décisions déjà prises affiché sous
    chaque demande. Remontée aussi sur `/alertes`
    ("Demandes de modification de séquencement en attente").
  - `POST /api/joints` — créer un joint (numérotation automatique,
    authentification requise)
  - `POST /api/controles-dimensionnels` — réaliser un contrôle (le
    contrôleur est automatiquement la personne connectée), avec ouverture
    automatique de FNC si hors tolérance ; si un outil est renseigné et
    n'est plus valide (échéance dépassée ou hors service), le contrôle
    est refusé (422) — une mesure prise avec un outil non vérifié n'est
    pas exploitable
  - `POST /api/matieres` — réceptionner une matière (fournisseur, CCPU,
    certificat, coulée/lot...), niveau 2 minimum ; réutilisée ensuite sur
    chaque joint (`Joint.matiereId`) sans être ressaisie ; renvoie
    `{matiere, alertes}` (alertes de conformité par rapport à ce qui est
    prévu pour l'affaire, jamais bloquant)
  - `GET`/`POST /api/matieres-prevues` — déclarer ce qui est
    commandé/prévu pour une affaire (niveau 2 minimum), comparé
    automatiquement à chaque matière réceptionnée sur cette affaire
  - `POST /api/outils` — enregistrer un outil de métrologie/outillage,
    avec un QR code généré automatiquement (niveau 2 minimum). Si la date
    d'échéance n'est pas saisie, elle est calculée automatiquement à
    partir de la date de vérification : **1 an par défaut, 6 mois pour
    une pince ampèremétrique** (règle dans `src/lib/statutOutil.ts`,
    comparaison sur le type d'outil — à étendre là si d'autres exceptions
    doivent être déclarées)
  - `PATCH /api/outils` — enregistrer une nouvelle vérification (recalcule
    l'échéance selon la même règle)
  - `GET /api/outils/qr/[valeur]` — identification d'un outil à partir
    d'un scan QR, avec vérification de validité immédiate (échéance,
    hors service)
  - `GET /api/alertes` — outils bientôt à échéance (60 jours, même seuil
    que pour les qualifications) ou déjà expirés, et qualifications dont la
    confirmation de validité périodique (voir plus bas) est bientôt due (30
    jours) ou en retard ; voir aussi la page `/alertes`
  - `POST /api/qualifications/[id]/evenements` avec
    `{"type":"CONFIRMATION_VALIDITE"}` — enregistre une confirmation de
    validité (niveau 2 minimum), sans jamais toucher à l'échéance finale ni
    au statut de la qualification ; bouton "Confirmer la validité" sur la
    page `/personnel`
  - `POST /api/destinataires-alertes`, `DELETE /api/destinataires-alertes/[id]`
    — bibliothèque des destinataires du récapitulatif hebdomadaire (nom +
    email, niveau 2 minimum) ; réenregistrer une adresse déjà présente met
    à jour son nom plutôt que de la dupliquer ; interface dans la page
    `/alertes`
  - `GET`/`POST /api/alertes/recapitulatif` — construit et envoie le
    récapitulatif hebdomadaire (chaque lundi 7h UTC via `vercel.json`, ou
    déclenchable à la main par une personne de niveau 3). **Sans effet
    tant que `RESEND_API_KEY` et `ALERTES_EMAIL_FROM` ne sont pas
    configurées** (voir "Ce qui n'est pas encore fait")
  - `PATCH /api/fnc` — faire avancer le workflow d'une FNC ; faire passer
    une FNC en VALIDATION ou CLOTUREE est réservé au niveau 3 et
    enregistré dans l'audit trail (traçabilité de la décision de validation)
  - `POST /api/joints/[id]/reparation` — remise en conformité (réparation,
    meulage, resurfaçage, reprise, remplacement, contrôle complémentaire) :
    crée un nouveau joint lié au joint d'origine (même numéro, indice de
    réparation incrémenté — M800 → M800 R1 → M800 R2...), qui n'est jamais
    modifié ni écrasé. Si elle répond à une FNC, celle-ci passe en
    ACTION_CORRECTIVE et s'y rattache. Un nouveau contrôle conforme réalisé
    ensuite sur ce joint fait automatiquement avancer la FNC jusqu'à
    CONTROLE (jamais plus loin sans décision niveau 3, voir `PATCH /api/fnc`
    ci-dessus) — ce comportement est branché sur les six types de
    contrôles existants
  - `POST /api/personnel/[id]/fonctions` — ajouter une fonction (soudeur,
    contrôleur, chargé de travaux...) à une personne (niveau 2 minimum)
  - `GET /api/personnel/[id]` — fiche complète : fonctions, qualifications,
    habilitations, formations, acuités visuelles, avec leur statut
    (valide / bientôt à échéance / expiré / en renouvellement / suspendu)
    recalculé à partir des dates à chaque lecture
  - `POST /api/qualifications` — enregistrer une QS (niveau 2 minimum)
  - `POST /api/qualifications/[id]/evenements` — faire avancer l'historique
    d'une qualification (`RECONDUCTION_PROPOSEE`, `RECONDUCTION_VALIDEE`,
    `SUSPENSION`). Weldoc peut *proposer* une reconduction automatiquement
    (voir plus bas), mais ne la valide jamais seul : la validation et la
    suspension sont réservées au niveau 3.
  - `POST /api/habilitations`, `POST /api/formations`,
    `POST /api/acuites-visuelles` — même logique (niveau 2 minimum) ; un
    renouvellement crée un nouvel enregistrement, l'ancien n'est jamais
    modifié ni supprimé
  - `POST /api/controles-visuels` — contrôle visuel (VT) d'un joint : le
    résultat est déduit des indications saisies (jamais imposé
    directement), FNC automatique si non conforme
  - `POST /api/controles-ressuage` — contrôle par ressuage (PT) : exige un
    contrôle visuel préalable sur le même joint (refusé sinon), mêmes
    principes que le contrôle visuel, et peut référencer les consommables
    utilisés (pénétrant, révélateur, nettoyant)
  - `POST /api/consommables-cnd` — bibliothèque des consommables CND
    (fabricant, référence, lot, péremption), enregistrés une fois puis
    réutilisés sur chaque PV. Couvre les quatre méthodes qui en utilisent
    (`TypeConsommableCND`) : ressuage (pénétrant, révélateur, nettoyant),
    magnétoscopie (poudre magnétique, produit de contraste, démagnétisant),
    radiographie (film, produit de développement), ultrasons (couplant),
    plus un type "autre" pour ce qui ne rentre dans aucune case. Page
    `/consommables` : liste + petit formulaire d'ajout (le seul endroit de
    l'application où un consommable se crée — ensuite il est seulement
    choisi, jamais ressaisi). **Certificat de conformité** : le champ
    `certificatUrl` existait en base sans interface, il est maintenant
    exposé dans le formulaire (lien manuel ou `FileUpload`, colonne
    "Certificat" dans le tableau) avec `LectureAutomatique`
    (`type="CONSOMMABLE"`) qui propose fabricant/référence/lot/péremption
    à partir du certificat déposé — voir "Lecture automatique des
    documents déposés" ci-dessous, qui couvre maintenant aussi les
    consommables CND en plus des qualifications/habilitations/matières
    (voir le cahier des charges, "CONSOMMABLES" : "reconnaissance de
    caractères pour proposer automatiquement... le contrôleur valide").
  - `POST /api/controles-magnetoscopie`, `POST /api/controles-radiographie`,
    `POST /api/controles-ultrasons` — MT/RT/UT, même principe que le
    contrôle visuel (résultat déduit des indications, FNC automatique si
    non conforme), et comme le ressuage peuvent référencer les
    consommables utilisés (`controle-cnd-consommables-form.tsx`, page
    `/joints` : chaque méthode ne propose que les types de consommables
    qui la concernent). Elles acceptent maintenant aussi un `outilId`
    (équipement/banc utilisé) qui pointe vers la même bibliothèque
    métrologie que le contrôle dimensionnel (`Outil`, voir
    `src/lib/statutOutil.ts`) : un outil expiré ou hors service **bloque**
    le contrôle (`verifierOutilPourControle`, factorisé et repris par les
    quatre méthodes concernées — dimensionnel, magnétoscopie,
    radiographie, ultrasons), contrairement aux autres vérifications de
    l'application qui restent purement indicatives. Ce n'est pas une
    décision réglementaire de Weldoc : une mesure prise avec un outil non
    vérifié n'est simplement pas exploitable, c'est un fait métrologique.
  - `POST /api/indisponibilites` — déclarer une période d'indisponibilité
    (congé, maladie, formation, autre), utilisée pour détecter les
    conflits de planning (niveau 2 minimum). **Interface** (jusqu'ici API
    seule, sans aucun écran) : bouton "+ Déclarer une indisponibilité"
    sur `/personnel`, avec l'historique complet affiché sous chaque
    personne (badge "en cours" pour une période qui couvre la date du
    jour).
  - `POST /api/affectations` — affecter une personne à une affaire (et
    éventuellement un joint précis), avec ses codes d'habilitation/accès
    site (`Affectation.codes` — texte libre, ex. "CODES GTA" chez
    certains clients, jamais interprétés par Weldoc). Vérifie compétence,
    qualification, habilitation et disponibilité, mais **ne bloque
    jamais** la création : les alertes sont renvoyées dans la réponse (et
    tracées dans l'audit trail s'il y en a), la décision de passer outre
    reste humaine, comme demandé au cahier des charges ("signale... peut
    proposer"). `PATCH /api/affectations` fait avancer son statut
    (notamment `EN_COURS` = présence effective sur le chantier).
  - `src/app/affaires/[id]/planning/page.tsx` — la page qui manquait pour
    piloter tout ça (jusqu'ici seule l'API existait) : affectations
    groupées par fonction, formulaire d'ajout (avec alertes affichées),
    boutons "Marquer présent"/"Terminer"/"Annuler".
  - `GET /api/affaires/[id]/organigramme` — généré automatiquement à
    partir des rôles de l'affaire et des affectations actuellement
    actives ; rien n'est stocké séparément, donc toujours à jour par
    construction. Pour chaque personne de l'équipe : ses codes, si elle
    est actuellement présente (statut `EN_COURS`), et le nombre de ses
    habilitations expirées — de quoi alimenter à la fois l'annexe
    organigramme et l'annexe habilitations du rapport de fin de
    fabrication (section "4. Organigramme de l'intervention" de
    `/affaires/[id]/dossier`, qui affiche maintenant toute l'équipe du
    planning et plus seulement les 3 rôles fixes de l'affaire).
- `src/lib/sequencement.ts` — crée les 5 séquences par défaut, et vérifie
  qu'une phase peut démarrer (séquences précédentes terminées, ou
  dérogation acceptée par le niveau 3).
- `src/lib/remiseEnConformite.ts` — fait avancer une FNC de ACTION_CORRECTIVE
  à CONTROLE après un contrôle conforme sur le joint qui la résout.
- `src/lib/avancement.ts` — calcule (à la lecture, rien n'est stocké) le
  pourcentage d'avancement d'une affaire à partir des phases de son
  séquencement (terminées / applicables, les phases "non applicable"
  n'entrant pas dans le calcul), plus quelques indicateurs (joints,
  contrôles dimensionnels conformes, FNC ouvertes).
  - `GET /api/affaires/[id]/avancement` — le même calcul, exposé en API.
  - `src/app/avancement/page.tsx` — liste des affaires avec leur
    pourcentage global (barre de progression).
  - `src/app/avancement/[id]/page.tsx` — détail par séquence, sous forme
    de barres empilées (terminé/en cours/à faire/non applicable) avec les
    effectifs en clair à côté de chaque barre.
  - **Avancement joint par joint** ("38 joints soudés sur 120 prévus"),
    en plus de l'avancement par phase : nouveau champ
    `Affaire.nombreJointsPrevus` (saisi une fois, ex. d'après le plan
    d'isométrie — `PATCH /api/affaires/[id]`, bouton "Saisir le nombre de
    joints prévus"/"Corriger" sur `/avancement/[id]`), comparé aux joints
    d'origine dont la fiche technique de suivi de soudage est **signée**
    (`FicheTechniqueSoudage.signatureId`, donc les valeurs attestées
    comme définitives — les réparations ne comptent ni dans "prévus" ni
    dans "soudés", c'est un travail en plus de la fabrication initiale).
    Affiché sur `/avancement/[id]` (barre de progression dédiée),
    `/avancement` (liste) et la page d'accueil, partout où l'avancement
    par phase l'était déjà — masqué tant que le nombre prévu n'a pas été
    saisi, pour ne jamais afficher un pourcentage inventé.
  - **Clore une phase par signature QR + PIN** — jusqu'ici, faire avancer
    une phase se faisait par un simple menu déroulant "Enregistrer", sans
    aucune identification. Chaque phase de `/avancement/[id]`
    (`PhaseLigne`) porte maintenant une case à cocher (masquée une fois
    Terminée ou Non applicable), et une barre "Signer les phases cochées"
    en bas de la liste (`PhasesSection`) : l'exécutant coche une ou
    plusieurs phases qu'il vient de réaliser, saisit son identifiant
    (matricule ou QR) et son code PIN **une seule fois**, et ça vaut
    signature pour chacune (`POST /api/phases/signer`,
    `signerPlusieursDocuments` dans `src/lib/signature.ts` — même PIN que
    pour signer un document ailleurs dans l'application, pas de nouveau
    secret). Une ligne signée affiche "✓ Signée par Prénom Nom le
    JJ/MM/AAAA". Le menu déroulant reste disponible pour EN_COURS, NON
    APPLICABLE (avec justification) ou relier une procédure interne — des
    actions qui ne sont pas des actes de signature.
- `src/lib/dossierFinFabrication.ts` — rapport de fin d'intervention (RFI),
  restructuré pour suivre précisément le modèle réel fourni par
  l'entreprise (un vrai document EDF/ULM) : seule la **structure** du
  modèle a été reprise (intitulés de sections, colonnes des tableaux) —
  aucune valeur réelle d'un chantier (noms, CNPE, références précises) n'a
  été recopiée dans le code, par confidentialité. Rassemble, pour une
  affaire : le cartouche (entité émettrice, offre de service,
  accessibilité, historique des révisions, listes de diffusion
  interne/externe — nouveaux modèles `BilanIntervention`, `RevisionRFI`,
  `DiffusionRFI`), les travaux réalisés par intervenant
  (`PerimetreTravaux`), l'organigramme, l'avancement, le personnel
  intervenant, WPS/QMOS et consommables CND utilisés, les joints, une
  chronologie de l'intervention (`EvenementChronologie`), les pièces
  remplacées (réutilise `Matiere`, jamais ressaisi), les FNC avec leur
  traitement déduit (accepté/remplacé/réparé — voir
  `traitementFNC` dans `src/lib/remiseEnConformite.ts`, pas un nouveau
  champ : déduit du type d'action de réparation ou d'une clôture sans
  réparation), le bilan radioprotection (dosimétrie `BilanDosimetrique`,
  portiques `PortiqueRadioprotection`), le bilan global/REX (bonnes
  pratiques, dysfonctionnements, mesures correctives), et une liste
  d'éléments manquants signalés (contrôle visuel absent, FNC non
  clôturée, qualification expirée ou suspendue) — un signalement
  indicatif, jamais un blocage décidé par Weldoc (le seul vrai blocage
  vient du dossier réglementaire, voir plus bas). Les annexes du modèle
  réel (organigrammes détaillés, dossier de réalisation de travaux,
  documents divers) restent hors périmètre pour l'instant — voir le book
  photo, le dossier réglementaire et les PV externes en attendant.
  - `GET`/`PATCH /api/affaires/[id]/bilan-intervention` — contenu
    narratif du RFI (définition, conformité, bilans radioprotection/REX...).
  - `GET`/`POST /api/diffusions-rfi`, `/api/revisions-rfi`,
    `/api/perimetres-travaux`, `/api/chronologie`,
    `/api/portiques-radioprotection` — les listes du cartouche et du corps
    du rapport, chacune avec son formulaire d'ajout sur la page.
  - `GET`/`PATCH /api/affaires/[id]/bilan-dosimetrique` — bilan
    dosimétrique global de l'affaire (EDPI/EDPO/réalisé/delta/aléa, en
    mSv) ; le détail par activité renvoie à l'outil de suivi dosimétrique
    externe de l'entreprise, hors périmètre de Weldoc.
  - `GET`/`POST /api/affaires/[id]/rapport-fin-fabrication` — validation
    du rapport (niveau 3, voir le cahier des charges : "signé par une
    personne habilitée"). Pas de nouvelle table : la validation, c'est la
    signature QR + PIN elle-même (`Signature`, `documentType`
    `"RAPPORT_FIN_FABRICATION"`) — mêmes principes que partout ailleurs
    dans l'application (personne, date, signature tracées). Contrairement
    aux autres signatures (créées via `POST /api/signatures` puis
    simplement référencées), celle-ci est créée par la route elle-même
    (`src/lib/signature.ts`, `creerSignature`), et seulement après avoir
    vérifié l'absence de point réglementaire bloquant (voir dossier
    réglementaire ci-dessous) : comme c'est la seule preuve persistée de
    la validation, elle ne doit jamais pouvoir exister sans qu'une
    validation ait réellement abouti.
  - `src/app/affaires/[id]/dossier/page.tsx` — la page elle-même, pensée
    pour l'impression navigateur (bouton "Imprimer / exporter en PDF" —
    pas de génération de PDF côté serveur pour l'instant, ce qui
    ajouterait une dépendance à choisir avec vous). Lien depuis la page
    d'accueil, à côté de chaque affaire. N'offre de signer que si aucun
    point réglementaire bloquant ne subsiste (sinon un message renvoie
    vers le dossier réglementaire pour les lever).
- **PV externes** (voir le cahier des charges, "PV EXTERNES") — documents
  produits par un prestataire externe (PV de contrôle sous-traité,
  certificat matière...), importés et rattachés à une affaire et,
  optionnellement, à un joint ou une phase précis. Modèle `PVExterne` :
  intitulé, prestataire, date du document, `url` (texte libre pour
  l'instant — même limite que `Photo`, voir plus haut). Import réservé au
  niveau 2 (l'importeur est toujours la personne connectée) ; revue
  réservée au niveau 3 (conforme/non conforme + commentaire), et
  **jamais modifiable une fois faite** — un document corrigé se réimporte
  comme un nouveau `PVExterne` plutôt que d'écraser la revue existante,
  conformément au principe "rien n'est jamais écrasé".
  - `GET`/`POST /api/pv-externes` — liste (filtrable par affaire/joint/
    phase) et import.
  - `POST /api/pv-externes/[id]/revue` — enregistre la revue ; refuse
    (422) si le document a déjà été revu.
  - `src/app/affaires/[id]/pv-externes/page.tsx` — liste des documents
    d'une affaire (statut de revue en couleur) et formulaires d'import/
    revue. Lien depuis la page d'accueil et le rapport de fin de
    fabrication (qui affiche aussi le nombre de documents).
- **Documents externes et bibliothèque documentaire** (voir le cahier des
  charges, "DOCUMENTS EXTERNES ET BIBLIOTHÈQUE DOCUMENTAIRE") — distinct
  des PV externes ci-dessus : un `DocumentExterne` (fournisseur,
  sous-traitant, prestataire CND ou traitement thermique, organisme
  externe...) peut se relier à la fois à plusieurs affaires, joints,
  phases, FNC, personnes et équipements, plutôt que d'être réimporté pour
  chaque usage ("un document n'est jamais téléchargé plusieurs fois pour
  plusieurs usages"). Même principe de versionnage que WPS/QMOS/
  ProcedureInterne (`annoterStatutProcedures` réutilisée telle quelle) :
  une nouvelle révision est un nouvel enregistrement. La validation
  (conforme/non conforme + commentaire, niveau 3, jamais modifiable une
  fois faite) réutilise l'enum `ConclusionRevuePVExterne` plutôt que d'en
  recréer un équivalent.
  - **Remarque technique** : les six relations (`affaires`/`joints`/
    `phases`/`fncs`/`personnel`/`outils`) sont des relations Prisma
    plusieurs-à-plusieurs implicites. Même un seul `connect` sur une
    relation de ce type ouvre une transaction côté pilote Prisma — or
    celui utilisé (voir `src/lib/prisma.ts`) ne les supporte pas. Le lien
    se fait donc par une requête SQL directe (`$executeRaw`) sur la table
    de jointure implicite générée par Prisma, une par élément relié,
    après la création du document seul.
  - `GET`/`POST`/`PATCH /api/documents-externes` — liste (filtrable par
    affaire/joint/phase/FNC/personnel/équipement), import (niveau 2), et
    retrait/réactivation.
  - `POST /api/documents-externes/[id]/validation` — réservé au niveau 3 ;
    refuse (422) si déjà validé.
  - `src/app/documents/page.tsx` — bibliothèque globale (pas rattachée à
    une affaire en particulier) : import avec sélection multiple des
    éléments concernés, statut de version, validation. Lien depuis la
    page d'accueil.
- **Prise en charge / restitution du chantier** (voir le cahier des
  charges) — un état des lieux en début d'intervention, un autre en fin :
  zone concernée, observations, dégradations constatées, documents
  d'entrée reçus, réserves (transmissibles au client), photos. Modèle
  `EtatDesLieux` (type `PRISE_EN_CHARGE`/`RESTITUTION`) + `ReserveConstat` ;
  les photos réutilisent le modèle `Photo` du book photo (nouveau lien
  optionnel `etatDesLieuxId`), rien n'est dupliqué. Un nouveau constat,
  même type, ne remplace jamais le précédent (rien n'est jamais écrasé) :
  c'est le plus récent de chaque type qui fait foi, les anciens restant
  consultables en historique repliable. Modifiable (constat, réserves,
  photos) tant qu'il n'est pas signé (QR/matricule + PIN, comme la fiche
  technique de suivi de soudage) ; une fois signé, plus aucune
  modification n'est acceptée. Un problème plus grave qu'une simple
  réserve se déclare comme FNC via le module FNC déjà existant, en la
  reliant à la même affaire — pas de "fiche d'aléa" séparée pour l'instant,
  pour ne pas dupliquer ce workflow.
  - `GET`/`POST /api/etats-des-lieux`, `PATCH /api/etats-des-lieux/[id]`,
    `POST /api/etats-des-lieux/[id]/reserves`.
  - `src/app/affaires/[id]/etat-des-lieux/page.tsx` — les deux constats
    (prise en charge / restitution) côte à côte, avec une section
    "Comparaison avant / après" qui rapproche automatiquement les
    dégradations constatées aux deux moments (rien de stocké en plus pour
    ça) — utile pour justifier qu'une dégradation était déjà présente
    avant l'intervention. Lien depuis la page d'accueil et le rapport de
    fin de fabrication (qui affiche aussi le nombre de constats).
- **Audit trail** (voir le cahier des charges) — `src/lib/auditTrail.ts`,
  fonction `tracerModification` : historique des modifications sensibles
  (qui, quand, entité concernée, ancienne/nouvelle valeur, motif),
  jamais supprimé (aucune route de suppression sur `AuditTrail`). Ne
  duplique pas ce que des modèles déjà événementiels tracent eux-mêmes
  (`QualificationEvenement`, `PointReglementaireEvenement`, `RevisionRFI`...
  — chacun est déjà, dans son domaine, un historique complet) : sert les
  actions qui n'ont pas encore leur propre historique dédié.
  - Branché sur : la création d'une affectation malgré des alertes,
    la validation/clôture d'une FNC, la décision sur une demande de
    modification de séquencement (trois branchements déjà existants,
    désormais centralisés sur le même helper), et l'avancement d'une
    phase (`PATCH /api/phases` — nouveau : une phase n'a pas d'historique
    propre, contrairement aux qualifications ou au dossier réglementaire).
  - `GET /api/audit-trail?entite=...&entiteId=...`, page `/audit` —
    réservés au niveau 3 (outil de contrôle interne, voir "DROITS ET
    MODIFICATIONS"), lien visible uniquement pour ce niveau depuis la page
    d'accueil. Filtrable par entité en cliquant sur son nom dans le
    tableau.
- **Système qualité** (voir le cahier des charges) — `src/lib/systemeQualite.ts`,
  fonction `calculerIndicateursQualite` : rassemble ce qui existe déjà
  ailleurs (qualifications/habilitations/formations par statut, FNC,
  contrôles réalisés par méthode avec taux de conformité, points
  réglementaires bloquants ouverts, validations de rapport de fin de
  fabrication, signatures, bibliothèques versionnées WPS/QMOS/procédures
  internes/documents externes/bibliothèque dimensionnelle) en indicateurs
  exploitables pour un audit ISO 9001 — rien de nouveau n'est stocké,
  tout est recalculé à la lecture à partir des modules existants. Comme
  le cahier des charges le précise, Weldoc fournit des preuves
  structurées mais ne "certifie" jamais l'entreprise lui-même.
  - Page `/systeme-qualite`, réservée au niveau 3 (même logique que
    l'audit trail : outil de contrôle interne), lien visible uniquement
    pour ce niveau depuis la page d'accueil. Renvoie vers l'audit trail
    pour le détail événement par événement.
- **Retour d'expérience (REX)** (voir le cahier des charges) — une fiche
  REX par FNC documentée (`FicheREX`, `fncId` unique) : type de problème,
  origine, cause, solution, résultat. Le classement par matériau/procédé/
  fournisseur/type de joint/chantier, prévu au cahier des charges, n'est
  jamais ressaisi : il se lit à la lecture sur le joint et l'affaire de
  la FNC (`Joint.matiere`, `Joint.wps`, `Affaire.chantier`...).
  "Identification de problématiques similaires" reste explicitement "à
  terme" au cahier des charges — pas construit ici (pas d'assistance IA
  sur la recherche) : seul un filtre manuel par type de problème aide à
  repérer des cas proches.
  - `GET`/`POST /api/rex` — liste et rédaction (n'importe quelle personne
    connectée : ce n'est pas une décision réglementaire, une FNC n'a
    qu'une seule fiche REX).
  - `src/app/rex/page.tsx` — les FNC sans fiche REX encore (avec le
    formulaire de rédaction), la base REX filtrable par type de problème,
    et le contexte du joint/de l'affaire affiché sous chaque fiche. Lien
    depuis la page d'accueil.
- **Dossier réglementaire** (voir le cahier des charges, "DOSSIER
  RÉGLEMENTAIRE" / "Blocage réglementaire") — distinct du rapport de fin
  de fabrication : ici, chaque exigence réglementaire (ex. "Attestation de
  conformité OHA", "Déclaration de conformité exploitant"...) est suivie
  individuellement, avec un historique de statut tracé (`PointReglementaire`
  + `PointReglementaireEvenement`, même principe que les qualifications :
  un changement de statut est un nouvel événement, jamais une modification
  du précédent). Intitulé et référentiel restent en texte libre. Un point
  peut concerner l'affaire entière, ou un joint/une phase précis.
  - 5 statuts prévus au cahier des charges (non bloquant / bloquant / sous
    réserve / attente décision / déblocage autorisé). **Choix
    d'interprétation à confirmer avec vous** (`src/lib/dossierReglementaire.ts`,
    fonction `pointBloque`) : seul le statut littéralement "bloquant"
    bloque quelque chose dans l'application ; "sous réserve" et "attente
    décision" sont des étapes de suivi affichées mais non bloquantes pour
    l'instant. Si votre pratique réelle veut que "attente décision" bloque
    aussi, c'est un changement d'une ligne à faire.
  - `GET`/`POST /api/points-reglementaires`, `POST
    /api/points-reglementaires/[id]/evenements` — création et changements
    de statut. Passer en "déblocage autorisé" est réservé au niveau 3 et
    exige une signature (`documentType` `"POINT_REGLEMENTAIRE"`) : Weldoc
    ne lève jamais seul un point bloquant.
  - Un point bloquant empêche concrètement deux choses : l'avancement
    d'une phase du chantier qu'il concerne (ou de toutes les phases s'il
    concerne l'affaire entière — voir `PATCH /api/phases`), et la
    validation du rapport de fin de fabrication (voir ci-dessus). C'est
    la seule vérification de l'application qui bloque réellement une
    action plutôt que de simplement la signaler — les FNC "bloquantes"
    et qualifications suspendues restent, elles, de simples signalements
    (`elementsManquants`) sans blocage technique.
  - `src/app/affaires/[id]/reglementaire/page.tsx` — liste des points
    d'une affaire (statut actuel en couleur, historique repliable) et
    formulaire d'ajout. Lien depuis la page d'accueil et le rapport de
    fin de fabrication (qui affiche aussi le nombre de points).
- Modèle `Photo` — "book photo" du cahier des charges : photos horodatées
  rattachées à une affaire et, optionnellement, à une phase/un joint/une
  FNC précis. `url` reste du texte libre pour l'instant (comme
  `FicheTechniqueSoudage.photosUrls`/`Piece.photosUrls` ailleurs dans le
  modèle) : une vraie prise en charge de fichiers suppose de choisir un
  hébergeur, ce qui engage un coût récurrent à discuter avec vous avant de
  s'engager.
  - `GET`/`POST /api/photos` — filtrable par affaire/joint/phase/FNC ;
    l'auteur est toujours la personne connectée.
  - `src/app/affaires/[id]/photos/page.tsx` — le book photo d'une
    affaire : galerie + formulaire d'ajout (adresse de la photo, légende,
    et rattachement optionnel à un joint/une phase/une FNC). Lien depuis
    la page d'accueil et depuis le rapport de fin de fabrication (qui
    affiche aussi le nombre de photos).
- `src/lib/planning.ts` — la vérification avant affectation. **Limite
  assumée** : la correspondance fonction → type de qualification requis
  (ex. "soudeur" → qualification SOUDAGE) est une liste en dur, pas une
  règle configurable par l'entreprise ; et on ne sait pas quelle
  habilitation précise est requise pour quelle fonction, donc on se
  contente de signaler les habilitations déjà expirées.
  - **Proposition d'affectation adaptée** (voir le cahier des charges,
    "PLANNING" : "peut proposer une affectation adaptée") :
    `proposerAffectation()` réutilise exactement `evaluerAffectation()`
    ci-dessus sur toutes les personnes ayant la fonction demandée,
    classées par nombre d'alertes croissant — les personnes disponibles
    et qualifiées en tête, sans jamais décider à la place de l'humain
    (`GET /api/affectations/proposition?fonction=...&dateDebut=...&
    dateFin=...&jointId=...`). Bouton "Voir les personnes adaptées" sur
    le formulaire d'affectation (`/affaires/[id]/planning`) : affiche
    chaque candidat avec ses éventuelles alertes, cliquer un nom
    pré-remplit le champ "Personne" du formulaire.
- `src/lib/qualifications.ts` — quand un soudeur réalise un joint, Weldoc
  vérifie si l'une de ses qualifications soudage arrive à échéance et, le
  cas échéant, propose automatiquement une reconduction (avec le joint
  comme preuve) — sans jamais la valider lui-même. Si le joint a un WPS
  structuré, la proposition n'est faite que si son domaine (procédé,
  groupe de matériaux, épaisseur, diamètre) couvre réellement la
  qualification (voir `src/lib/verificationQS.ts`) : un joint dont le
  WPS ne correspond manifestement pas n'est plus proposé comme preuve.
  Sans WPS structuré sur le joint, la correspondance ne peut pas être
  vérifiée automatiquement — la proposition est quand même faite, mais
  clairement signalée comme non vérifiée dans le commentaire, à charge
  pour la personne qui valide de juger. La validation elle-même
  (bouton "Valider la reconduction" sur `/personnel`, réservé au niveau
  3) demande la nouvelle échéance et rappelle qu'une reconduction par
  l'activité ne dispense pas, selon la plupart des référentiels, de
  repasser périodiquement la qualification initiale (Weldoc ne connaît
  pas cette périodicité, propre à chaque référentiel/entreprise — ex.
  tous les 3 ans — c'est à la personne qui valide de l'appliquer). Une
  reconduction proposée et non encore validée apparaît en alerte
  (`/alertes`, récapitulatif hebdomadaire) tant qu'elle attend une
  décision.
- Modèle `Qualification` — le type de qualification soudage (ex. "BW-A1",
  "FW-I2"...) et son domaine (groupe de matériaux, position, plages
  d'épaisseur/diamètre) sont maintenant des champs structurés
  (`codeQualification`, `groupeMateriaux`, `positionSoudage`,
  `epaisseurMinMm`/`Max`, `diametreMinMm`/`Max`), avec un lien optionnel
  vers un `Referentiel` — plutôt que noyés dans le texte libre
  `domaineValidite`. La nomenclature (BW/FW/SW...) n'est imposée par
  aucune table Weldoc : elle dépend du référentiel de l'entreprise ou du
  client, et se saisit librement (page `/personnel`, "Enregistrer une
  qualification soudage") — voir l'avertissement sur les normes
  protégées dans `src/lib/tolerances.ts`. Ça prépare le rapprochement
  automatique avec le domaine de validité d'un WPS, encore à construire
  (voir plus bas).
- **Bibliothèque des référentiels** — jusqu'ici, le modèle `Referentiel`
  existait et pouvait déjà être lié à une qualification ou un produit
  dimensionnel (`referentielId`), mais rien ne permettait d'en créer un
  sans accès direct à la base : les listes déroulantes concernées
  restaient donc toujours vides. Page `/referentiels`
  (`GET`/`POST /api/referentiels`, niveau 2 minimum, code unique — ex.
  "EN 13480", "ASME B31.3", "EN ISO 9606-1") pour les enregistrer une
  fois, puis les choisir ensuite partout où ils s'appliquent, jamais les
  ressaisir. Un référentiel se lie aussi maintenant à une affaire (voir
  `AffaireReferentiel`, jusqu'ici sans aucune interface) : section
  "Référentiels applicables" sur le dossier réglementaire
  (`/affaires/[id]/reglementaire`, `GET`/`POST`/`DELETE
  /api/affaires/[id]/referentiels`) — lier/délier, le référentiel
  lui-même n'est jamais supprimé, seul le lien l'est.
- `src/lib/controlesManquants.ts` — alerte "contrôles manquants" (voir le
  cahier des charges, "ALERTES"). `Affaire.controlesRequis` (`String[]`,
  sigles DIM/VT/PT/MT/RT/UT) se déclare une seule fois par affaire :
  section "Contrôles requis sur chaque joint" sur le dossier réglementaire
  (`/affaires/[id]/reglementaire`, `PATCH /api/affaires/[id]`). La
  fonction compare ensuite chaque joint d'origine (les réparations ne sont
  pas comptées, même principe que l'avancement joint par joint) aux
  contrôles réellement enregistrés, et liste ceux qui manquent —
  purement indicatif sur `/alertes`, jamais bloquant, et additif : une
  affaire qui n'a rien déclaré n'apparaît jamais dans cette alerte (même
  principe que `MatierePrevue`/`AutorisationSignature`).
- `src/lib/documentsManquants.ts` — alerte "documents manquants", même
  principe et même structure que `controlesManquants.ts` ci-dessus.
  `Affaire.documentsRequis` (`String[]`, sigles FICHE_SOUDAGE/
  CCPU_MATIERE/CERTIFICAT_MATIERE/TQC) se déclare une seule fois par
  affaire (section "Documents requis sur chaque joint" sur le dossier
  réglementaire). Chaque sigle correspond à un champ déjà existant
  ailleurs dans le modèle (`Joint.ficheSoudageId`,
  `Matiere.ccpuDocumentUrl`/`certificatUrl`, `Joint.tqc`) — la fonction
  vérifie seulement sa présence sur chaque joint d'origine, jamais son
  contenu ni sa conformité. Additif comme les modules du même genre :
  une affaire n'ayant rien déclaré n'apparaît jamais dans cette alerte.
- `src/lib/confirmationQualification.ts` — certains référentiels exigent,
  en plus de l'échéance finale d'une qualification, des confirmations
  périodiques (ex. tous les 6 mois) pour qu'elle reste valable — distinct
  d'une reconduction/prolongation complète. `Qualification.frequenceConfirmationMois`
  porte cette périodicité (propre à chaque qualification, jamais imposée
  par Weldoc, laissée vide si non exigée) ; la prochaine échéance de
  confirmation se recalcule à la lecture à partir du dernier événement
  `CONFIRMATION_VALIDITE` (ou de la date d'obtention s'il n'y en a pas
  encore eu), comme les autres statuts calculés de l'application. Alerte
  "bientôt due" (30 jours) ou "en retard" sur la page `/alertes` et dans
  le récapitulatif hebdomadaire par email. Une confirmation peut se
  justifier par un essai (rien à préciser) ou par l'activité réelle : le
  bouton "Confirmer la validité" (`/personnel`) permet de citer des
  joints déjà soudés par la personne comme preuve (`preuveJointIds` sur
  l'événement, comme pour `RECONDUCTION_PROPOSEE`) — les joints indiqués
  sont vérifiés (ils doivent exister et appartenir à cette personne).
  `Qualification.organismeExamen` trace, en texte libre, qui a
  examiné/délivré la qualification (pas forcément l'entreprise
  elle-même).
- `src/lib/signature.ts` — identification QR + PIN pour signer un document,
  comme demandé au cahier des charges ("Identification et signature") :
  identification (matricule ou QR) → authentification (code PIN, haché
  comme un mot de passe, jamais en clair) → vérification que la charte
  d'utilisation en vigueur a été acceptée → signature horodatée
  (`POST /api/signatures`). Le QR seul n'est jamais une signature (il est
  prêtable/copiable) : le PIN est systématiquement requis. Une session
  ouverte sur l'appareil reste nécessaire pour appeler la route, mais la
  personne qui signe peut être différente de celle connectée — pensé pour
  une tablette partagée où chacun s'identifie pour ses propres actes,
  sans se reconnecter.
  - `POST /api/personnel/[id]/pin` — définir/changer son code PIN
    (soi-même, ou niveau 3 pour un premier réglage/oubli) ; bouton
    "Définir le code PIN" sur `/personnel`. **6 chiffres minimum** (12
    maximum) — relevé depuis 4, ce PIN faisant office de signature
    électronique (identification de phase, documents...), il doit être
    plus difficile à deviner ou à épier qu'un simple code à 4 chiffres.
  - **Connexion à l'application par QR + PIN** — jusqu'ici, ce PIN ne
    servait qu'à signer un document une fois déjà connecté ; il n'existait
    aucun moyen de se connecter à Weldoc lui-même autrement que matricule
    + mot de passe. `POST /api/auth/login-qr` réutilise ce même PIN
    (`Personnel.pinHash`) pour se connecter directement par identification
    QR ou matricule + code PIN — pas de nouveau secret à créer ou à
    retenir, pensé pour une connexion rapide sur chantier (douchette QR ou
    saisie manuelle). Ouvre exactement la même session que la connexion
    par mot de passe (`creerSession`, même cookie). `/login` propose
    maintenant les deux méthodes, avec un bouton pour basculer de l'une à
    l'autre.
  - `GET`/`POST /api/chartes`, `POST /api/chartes/[id]/acceptation` —
    bibliothèque des versions de la charte (page `/charte`) : une
    nouvelle version ne remplace jamais la précédente, et il faut la
    réaccepter avant de pouvoir de nouveau signer.
  - Branché sur la validation d'une reconduction et la confirmation de
    validité de qualification (`/personnel`) : signer devient une étape
    obligatoire avant de pouvoir valider, avec `signatureId` conservé sur
    l'événement (`QualificationEvenement.signatureId`, référence libre
    comme `signatureId` ailleurs dans l'application).
- `src/lib/auth.ts` — briques d'authentification : mots de passe (hachés,
  jamais stockés en clair), sessions côté serveur (révocables
  immédiatement, par ex. si un compte est suspendu), vérification du
  niveau d'accès requis pour une action.
- `src/app/login/page.tsx` — page de connexion.
- `src/app/page.tsx` — page d'accueil listant les affaires (accès
  réservé aux personnes connectées). Chaque affaire affiche maintenant
  directement son état d'avancement (barre + pourcentage, même calcul que
  `/avancement` — voir `src/lib/avancement.ts`, rien n'est recalculé en
  double) et ses FNC ouvertes en rouge, sans avoir besoin d'ouvrir une
  page séparée pour voir où en est une affaire.
- `src/app/personnel/page.tsx` — tableau de bord par personne : fonctions,
  qualifications soudage/CND, habilitations, formations et acuité
  visuelle, chacune avec son statut recalculé à la lecture (valide /
  bientôt à échéance / expiré / suspendu). Les habilitations et l'acuité
  visuelle n'affichent que l'enregistrement le plus récent (l'ancien reste
  consultable dans un "Historique" repliable) ; les formations, elles,
  s'affichent en historique complet (une formation qui expire, comme un
  CACES, reste une échéance à surveiller même une fois recyclée). Les
  boutons "+ Enregistrer une habilitation / une formation / un test
  d'acuité visuelle" (`ajouter-habilitation.tsx`, `ajouter-formation.tsx`,
  `ajouter-acuite.tsx`) donnent enfin un écran de saisie à des API qui
  n'en avaient pas encore (`POST /api/habilitations`,
  `POST /api/formations`, `POST /api/acuites-visuelles`, tous existants
  depuis un module précédent).
  - **Documents justificatifs du personnel** (voir le cahier des charges,
    fiche personne : "..., documents justificatifs, ..."), au-delà des
    qualifications/habilitations/formations/acuités visuelles déjà
    modélisées : tout document libre attaché à une personne (pièce
    d'identité, permis, CACES, autorisation spécifique...). Nouveau
    modèle `DocumentJustificatifPersonnel`, `GET`/`POST /api/documents-
    justificatifs-personnel` (réservé au niveau 2 minimum pour l'ajout,
    comme les habilitations), bouton "+ Ajouter un document
    justificatif" sur `/personnel`. Même principe que les CCPU/documents
    externes : un lien vers un fichier déjà hébergé, pas de
    téléversement direct. Un renouvellement (nouvelle pièce, nouvelle
    échéance) est un nouvel enregistrement, jamais une modification du
    précédent — même affichage "actuel + historique repliable" que les
    habilitations, regroupé par intitulé.
  - **Droits et modifications** (voir le cahier des charges) : réservé au
    niveau 3, un bouton "Changer le niveau" par personne
    (`PATCH /api/personnel/[id]`) et, si un compte de connexion existe,
    "Suspendre/Réactiver le compte" (`PATCH /api/auth/comptes/[id]`).
    Un compte suspendu perd l'accès immédiatement — pas seulement à la
    prochaine connexion — car chaque requête revérifie son statut (voir
    `src/lib/auth.ts`). Une personne ne peut pas suspendre son propre
    compte (422), pour éviter un verrouillage accidentel. Les deux
    actions sont tracées par l'audit trail (entités `Personnel`/`Compte`).
  - **Dépôt de fichiers** ("le drive", voir le cahier des charges,
    "Stockage : documents, photos, certificats, PV, plans, scans") :
    jusqu'ici, tous les champs "lien vers un document" (CCPU, PV, book
    photo, certificats...) exigeaient un fichier déjà hébergé ailleurs.
    `POST /api/upload` dépose maintenant le fichier directement dans
    Weldoc (PDF ou image, 20 Mo max), stocké sur Vercel Blob — le
    stockage de fichiers du même hébergeur que l'application, la
    solution la plus simple vu que Weldoc est prévu pour tourner sur
    Vercel (voir `BLOB_READ_WRITE_TOKEN` dans `.env.example` pour
    l'activer : Storage → Create Database → Blob dans le tableau de bord
    Vercel du projet). Composant réutilisable `src/components/
    file-upload.tsx` : un bouton "ou déposer un fichier" à côté de
    chaque champ lien existant plutôt qu'à sa place — coller un lien
    déjà hébergé reste toujours possible. **"📷 Prendre une photo"** : un
    second bouton ouvre directement l'appareil photo de la tablette/du
    téléphone (attribut HTML `capture="environment"`, uniquement sur le
    bouton image — un PDF ne se "capture" pas), pour photographier sur
    le moment sans passer par la galerie. Les deux boutons envoient au
    même dépôt (`POST /api/upload`). Branché sur les certificats de
    qualification/habilitation/acuité visuelle et les documents
    justificatifs du personnel (voir ci-dessus), ainsi que sur le book
    photo (`/affaires/[id]/photos`), les PV externes
    (`/affaires/[id]/pv-externes`) et la réception d'une matière/CCPU
    (`/joints`, document CCPU et certificat) : c'est ce qui permet de
    déposer au fur et à mesure les habilitations/qualifications/acuités
    visuelles scannées, les photos, les PV de sous-traitants et les CCPU,
    sans passer par un hébergement externe.
    **Non testé en conditions réelles** dans cette session : l'environnement
    de développement n'a pas de jeton Vercel Blob configuré, donc le
    dépôt effectif d'un fichier (au-delà de l'authentification, du
    contrôle de type/taille et du message d'erreur "non configuré", qui
    ont bien été vérifiés) reste à confirmer une fois déployé avec le
    jeton en place.
  - **Lecture automatique des documents déposés** (voir le cahier des
    charges, "CONSOMMABLES" : "reconnaissance de caractères pour
    proposer automatiquement... le contrôleur valide, la photo
    originale est conservée comme preuve" — même principe appliqué ici
    aux qualifications/habilitations et aux CCPU/certificats matière) :
    une fois un certificat déposé (ou lié), bouton "Lire automatiquement
    le document" sur les formulaires "+ Enregistrer une qualification
    soudage", "+ Enregistrer une habilitation" et "+ Réceptionner une
    matière (CCPU)" — `POST /api/lecture-document`
    (`src/lib/lectureDocument.ts`) envoie le document à Claude (Anthropic,
    voir `ANTHROPIC_API_KEY` dans `.env.example`) et propose
    référence/norme/dates/organisme (qualification), intitulé/référence/
    dates (habilitation) ou fournisseur/désignation/norme produit/
    nuance/diamètre/épaisseur/coulée/lot (matière). **L'IA ne décide jamais
    seule** (PRINCIPE DE CONCEPTION) : les champs proposés se contentent
    de pré-remplir le formulaire habituel, exactement comme une saisie
    manuelle — la personne relit, corrige si besoin, et c'est elle qui
    enregistre. Un champ absent ou illisible sur le document revient à
    vide plutôt que d'être deviné. **Non testé en conditions réelles**
    (même limite que le dépôt de fichiers ci-dessus) : pas de clé
    Anthropic dans cet environnement de développement — authentification,
    validation et message d'erreur "non configuré" vérifiés ; la lecture
    effective d'un vrai certificat reste à confirmer une fois déployé
    avec `ANTHROPIC_API_KEY` en place.
- `src/app/alertes/page.tsx` — alertes centralisées (voir le cahier des
  charges, "ALERTES" : "Qualifications à échéance, habilitations expirées,
  documents obsolètes, FNC ouvertes, blocages, validations niveau 3 en
  attente, dossiers réglementaires incomplets, contrôles manquants, outils
  métrologiques expirés, documents manquants") : un seul écran plutôt que
  d'aller chercher chaque signal sur sa page d'origine. Douze catégories :
  qualifications et habilitations à échéance ou expirées (`calculerStatut`,
  même calcul que sur la fiche personnel), confirmations de validité de
  qualification et reconductions proposées (déjà existantes), FNC ouvertes
  (bloquantes mises en évidence), points bloquants du dossier réglementaire
  (`pointBloque`, même calcul que `/systeme-qualite`), contrôles manquants
  (voir `src/lib/controlesManquants.ts` ci-dessous), documents manquants
  (voir `src/lib/documentsManquants.ts` ci-dessous, même principe),
  vérifications d'outillage, et **validations niveau 3 en attente** :
  reconductions de qualification, documents externes non validés
  (`DocumentExterne.valideConclusion` null), PV externes non revus
  (`PVExterne.revueConclusion` null) et demandes de modification de
  séquencement non tranchées (`DemandeModificationSequencement.statut`
  `EN_ATTENTE`) — quatre états déjà modélisés ailleurs dans l'application
  (pages `/documents`, `/affaires/[id]/pv-externes`, `/avancement/[id]`),
  simplement pas remontés ici jusque-là. Chaque catégorie réutilise un
  calcul déjà en place ailleurs dans l'application — rien n'est recalculé
  différemment ici, tout reste recalculé à la lecture, jamais stocké.
  "Documents obsolètes" (une révision périmée dans la bibliothèque
  documentaire) reste distinct de "documents manquants" et n'est pas
  repris ici. Bibliothèque des destinataires du récapitulatif hebdomadaire
  par email, inchangée.
- `src/app/pieces/page.tsx` — prise en charge de pièces (atelier) et suivi
  de leur statut. "Photos des repères présents sur la pièce" accepte
  toujours des adresses collées à la main (une par ligne), et propose
  maintenant aussi `FileUpload` pour déposer directement une photo (son
  adresse s'ajoute à la liste). **Suivi des joints d'une pièce** (voir le
  cahier des charges, fabrication en atelier) — jusqu'ici `Piece` et
  `Joint` restaient deux objets indépendants ; `Joint.pieceId` (optionnel,
  n'a de sens que pour une affaire `ATELIER`) relie maintenant un joint à
  la pièce qu'il concerne. "Créer un joint" (`/joints`) propose "Pièce
  concernée" dès qu'au moins une pièce existe pour l'affaire choisie ; la
  page Pièces affiche sous chaque pièce ses joints liés avec leurs badges
  de contrôle (`BadgeControle`, réutilisé tel quel), pour suivre l'avancement
  d'une pièce sans dupliquer aucune donnée du joint.
- `src/app/joints/page.tsx` — création de joints, consultation groupée par
  affaire avec la chaîne de réparation affichée en clair (M800 → M800 R1 →
  M800 R2...), un badge par type de contrôle (résultat le plus récent) et
  les FNC ouvertes ; permet aussi de déclarer une remise en conformité
  directement depuis la page (utilise l'API déjà existante). Le WPS peut
  être choisi dans la bibliothèque (voir ci-dessous) ou saisi en texte
  libre si la fiche n'y est pas encore. Chaque joint a maintenant ses
  boutons "+ DIM/VT/PT/MT/RT/UT" pour saisir un contrôle directement
  depuis la page : les cinq méthodes à indications (VT, PT, MT, RT, UT)
  partagent le même formulaire (`controle-generique-form.tsx` — une seule
  indication non conforme rend le contrôle entier non conforme), le
  ressuage (PT) y ajoute le contrôle visuel préalable obligatoire et les
  consommables utilisés, et le contrôle dimensionnel a son propre
  formulaire (outil de mesure, norme produit, mesures — le résultat est
  toujours calculé côté serveur, jamais saisi). Chaque contrôle exige une
  signature QR/matricule + PIN avant de pouvoir être enregistré (voir
  `src/lib/signature.ts`).
  - Les cinq contrôles à indications (VT, PT, MT, RT, UT) portent aussi une
    section facultative, repliée par défaut ("N° de PV, critères
    d'acceptation et conditions d'examen") — `ConditionsExamenSchema` dans
    `src/lib/controles.ts` : numéro de PV, référentiel d'acceptation et son
    édition, catégorie de construction, niveau d'examen, méthode d'examen,
    surfaces examinées, état de la surface, éclairage, moyens utilisés.
    Tout est en texte libre : ces valeurs dépendent du référentiel du
    client ou de l'entreprise (CODETI, CODAP, RCC-M...) et ne sont jamais
    imposées par Weldoc. Ces champs sont propres au procès-verbal
    lui-même : les données déjà portées par le joint (type de joint,
    diamètre, épaisseur, matière) ne sont volontairement pas ressaisies
    ici, conformément au principe "une donnée saisie une seule fois".
  - Bouton "+ FTS" : la fiche technique de suivi de soudage (voir le
    cahier des charges, qui précise qu'"un exemple réel sera intégré
    ultérieurement pour finaliser tous les champs" — première version
    donc) : procédé, préchauffage, température interpasses, postchauffage,
    tension, intensité, vitesse, énergie, nombre de passes, temps,
    observations. L'identification (joint/soudeur/QS/WPS/QMOS/
    consommable/diamètre/épaisseur) n'est jamais redemandée : elle vient
    déjà de `Joint`. Modifiable/complétable tant qu'elle n'est pas signée ;
    une fois signée (QR/matricule + PIN), plus aucune modification n'est
    acceptée — la signature atteste des valeurs comme définitives.
    **Une même fiche peut couvrir plusieurs joints à la fois** (voir le
    cahier des charges, PRINCIPE CENTRAL : "une donnée saisie une seule
    fois") : quand un même soudeur a réalisé plusieurs soudures avec les
    mêmes paramètres dans la même période (même procédé, même tension...),
    le bouton "+ FTS" propose de cocher les autres joints de l'affaire pas
    encore couverts par une fiche — une seule saisie des paramètres, une
    seule signature (une seule fois le PIN) pour l'ensemble. Le modèle
    `FicheTechniqueSoudage` porte donc `joints Joint[]` (un joint
    n'appartient jamais qu'à une seule fiche à la fois — `Joint.
    ficheSoudageId`), et `GET`/`POST`/`PATCH /api/fiches-soudage`
    remplacent l'ancienne route par-joint (`GET /api/joints/[id]/
    fiche-soudage` ne sert plus qu'à retrouver la fiche d'un joint donné,
    avec la liste complète des joints qu'elle couvre). Retirer un joint
    d'une fiche non signée le libère aussitôt pour une autre ; un joint
    déjà couvert par une fiche ne peut pas être ajouté à une autre — il
    faut d'abord le retirer de la sienne. Le bouton devient "Fiche
    soudage" (au lieu de "+ FTS") pour chacun des joints déjà couverts, et
    l'affichage passe en lecture seule une fois signée. **Photos de la
    soudure** : `FicheTechniqueSoudage.photosUrls` (book photo de la
    fiche) est maintenant exposé dans le formulaire, avec `FileUpload`
    pour déposer directement plusieurs photos (ajout/retrait avant
    signature, lecture seule une fois signée) — jusqu'ici le champ
    existait en base sans aucune interface.
  - Bouton "+ TQC" : le "tel que construit" (voir le cahier des charges,
    "TQC (TEL QUE CONSTRUIT)") — localisation de la soudure, équipement,
    support, écarts par rapport au prévu, observations.
    `GET`/`PATCH /api/joints/[id]/tqc`, modèle `TQC`, mêmes règles que la
    fiche technique de suivi de soudage (modifiable jusqu'à la signature
    QR/matricule + PIN, lecture seule ensuite). Les références M800/M801
    (déjà sur `Joint`), les dimensions mesurées (déjà sur le contrôle
    dimensionnel du joint) et les photos (déjà sur le book photo, via
    `Photo.jointId`) ne sont jamais ressaisies ici. Les trois méthodes
    prévues au cahier des charges (ISO manuel sur tablette, scan 3D
    externe, book photo) sont maintenant toutes les trois construites —
    voir ci-dessous pour l'ISO manuel au stylet et le scan 3D.
  - ISO manuel au stylet (troisième méthode du TQC) :
    `src/app/joints/iso-canvas.tsx` (`IsoCanvas`), une zone de dessin à
    main levée par-dessus un fond optionnel (`TQC.isoFondUrl`, un lien
    vers un schéma iso déjà hébergé, même principe que le scan 3D
    ci-dessous). Fonctionne au stylet, au doigt ou à la souris via les
    événements `pointer` du navigateur — aucune bibliothèque ni matériel
    spécifique nécessaire, testé en conditions réelles (Chromium
    headless piloté par Playwright) : le trait se dessine, s'annule et
    s'enregistre correctement. Les traits (`TQC.isoTraits`, colonne
    `Json`) sont stockés comme des tracés vectoriels — liste de points en
    coordonnées relatives 0..1, couleur, épaisseur — jamais une image
    figée, pour rester nets sur n'importe quel écran et modifiables comme
    le reste du TQC tant qu'il n'est pas signé (mêmes boutons "Annuler le
    dernier trait" / "Tout effacer" avant l'enregistrement). Le TQC est
    donc maintenant complet sur ses trois méthodes.
  - Scan 3D (deuxième méthode du TQC, "voir le cahier des charges,
    'TQC (TEL QUE CONSTRUIT)' > 'Scan 3D'", signalée "fonction
    complémentaire, non obligatoire") : `GET`/`POST /api/scans-tqc`,
    modèle `ScanTqc`, section "Scan 3D (TQC)" sur `/joints`. Ne conserve
    que la trace d'un scan externe déjà réalisé — fichier source, date,
    opérateur (toujours la personne connectée), zone couverte,
    logiciel/version, fichier généré, ISO/TQC résultant — même principe
    que les CCPU et documents externes : un lien vers un fichier déjà
    hébergé, pas de téléversement direct dans Weldoc. Une zone peut
    couvrir plusieurs joints à la fois (`ScanTqc.joints`), sans jamais
    redemander leurs dimensions ou leurs photos. Comme un état des
    lieux ou un document externe, un nouveau scan de la même zone est un
    nouvel enregistrement, jamais une modification du précédent — pas de
    `PATCH` sur ce modèle.
- `src/lib/procedures.ts` — bibliothèque des WPS/DMOS et des QMOS
  (`GET`/`POST`/`PATCH /api/wps` et `/api/qmos`, page `/procedures`) :
  une nouvelle révision (Rev 0, Rev 1...) n'écrase jamais la précédente,
  c'est un nouvel enregistrement ; le statut "en vigueur / ancienne
  version / retirée" est recalculé à la lecture (jamais stocké), comme le
  statut des qualifications ou de l'outillage ailleurs dans l'application.
  Un WPS peut être relié à la QMOS qui le justifie. `Joint.wpsId`/`qmosId`
  pointent vers la bibliothèque quand la fiche y existe. Un WPS porte
  aussi un type d'assemblage (bout-à-bout/angle/emmanché-soudé/
  rechargement/autre) et le détail passe par passe (`WpsPasse` : procédé,
  position, métal d'apport, gaz, courant, intensité, tension... ce qu'un
  soudeur suit réellement pendant le soudage), créé en même temps que le
  WPS et jamais modifié ensuite — une correction se fait via une nouvelle
  révision.
  - Une troisième section "Procédures internes" sur la même page (voir le
    cahier des charges, "DOCUMENTATION ET PROCÉDURES INTERNES") :
    bibliothèque des procédures/instructions/formulaires/PV
    types/fiches techniques de l'entreprise (`ProcedureInterne`,
    `GET`/`POST`/`PATCH /api/procedures-internes`), même principe de
    versionnage que WPS/QMOS — `annoterStatutProcedures` est directement
    réutilisée, générique, sans rien dupliquer. `Phase.procedureInterneId`
    relie une phase à une révision précise : comme cette révision n'est
    elle-même jamais modifiée après coup, ce simple lien suffit à
    conserver "la version réellement utilisée à l'exécution" (pas besoin
    d'un historique séparé). Le lien se change indépendamment du statut
    de la phase, et chaque changement (statut ou procédure) est tracé par
    l'audit trail (voir plus bas).
  - `/avancement/[id]` (page de détail d'une affaire) affiche maintenant
    aussi, sous les séquences, la liste de ses phases avec un formulaire
    par phase (`phase-ligne.tsx`) : changer le statut, marquer non
    applicable avec justification, et relier une procédure interne — la
    seule interface qui permettait jusqu'ici de faire avancer une phase
    était `PATCH /api/phases` en API brute.
- `src/lib/verificationQS.ts` — rapproche les qualifications soudage
  actives d'un soudeur avec le domaine d'un WPS (procédé, groupe de
  matériaux, épaisseur, diamètre), pour aider à vérifier qu'il est bien
  qualifié avant soudage. Purement indicatif, jamais bloquant : affiché
  comme alerte sur `/joints` (créer un joint, ou consulter un joint
  existant, avec soudeur ET WPS renseignés) et exposé en API via
  `GET /api/qualifications/verification-qs?personnelId=...&wpsId=...`.
- **Temps et productivité** (voir le cahier des charges) — distingue temps
  théorique (`Wps.tempsTheoriqueMin`, un barème saisi une fois par WPS),
  temps prévu (`Affectation.dureeEstimeeMin`, quand l'affectation
  concerne un joint précis) et temps réel
  (`FicheTechniqueSoudage.tempsMin`, déjà existant). `src/lib/productivite.ts`
  calcule médiane et quartiles (25ᵉ/75ᵉ percentile, méthode par
  interpolation linéaire) **par WPS** — la "configuration comparable"
  retenue (même procédé, même domaine) — et jamais par soudeur : le
  cahier des charges demande explicitement d'éviter tout classement de
  vitesse individuelle, donc aucune vue par personne n'existe dans ce
  module.
  - `src/app/productivite/page.tsx` — tableau théorique/prévu/réel par
    WPS, avec le nombre de joints ayant un temps réel renseigné. Lien
    depuis la page d'accueil. Une fiche technique de suivi de soudage
    pouvant désormais couvrir plusieurs joints à la fois (saisie
    groupée, voir ci-dessus), son `tempsMin` compte une seule fois par
    WPS distinct rencontré parmi ses joints — pas une fois par joint —
    pour ne pas gonfler artificiellement l'échantillon avec la même
    mesure répétée.
  - Champs ajoutés aux formulaires existants : "Temps théorique" sur
    "+ Créer le WPS/DMOS" (`/procedures`), "Temps prévu" sur
    "Affecter" (`/affaires/[id]/planning`, visible seulement quand un
    joint est choisi).
- `prisma.config.ts` — configuration Prisma (schéma, migrations) : utilise
  `DATABASE_URL` en connexion PostgreSQL classique, utilisée par la CLI
  (`prisma migrate`, etc.).
- `src/lib/prisma.ts` — connexion de l'application à la base : passe par le
  pilote HTTPS de Neon (`@prisma/adapter-neon` + `@neondatabase/serverless`)
  plutôt qu'une connexion PostgreSQL TCP classique. Utile si l'hébergement
  de l'application n'autorise que du trafic HTTPS sortant (certains
  environnements cloud restreints). Fonctionne aussi normalement partout
  ailleurs. **Limite technique à connaître** : ce pilote ne supporte pas
  les transactions (ni `$transaction`, ni les écritures imbriquées, ni
  `upsert()`) — voir le commentaire dans ce fichier avant d'écrire du code
  qui enchaîne plusieurs écritures liées.

## Ce qui n'est PAS encore fait (volontairement)

- La "QS" (vérification que la qualification soudage du soudeur couvre
  bien le WPS affecté à un joint) est maintenant faite, mais reste
  volontairement simple : `src/lib/verificationQS.ts` compare seulement
  les champs structurés (procédé, groupe de matériaux, plages
  d'épaisseur/diamètre) entre les qualifications actives du soudeur et le
  WPS du joint. Elle ne connaît pas les règles d'extension d'un
  référentiel (ex. une qualification FW qui étend la validité d'une
  qualification BW) — ces règles sont propres à chaque norme/entreprise et
  ne sont pas reproduites dans Weldoc (voir l'avertissement sur les
  normes protégées). Le résultat est purement indicatif : affiché comme
  alerte non bloquante sur `/joints` (badge orange) et disponible via
  `GET /api/qualifications/verification-qs`, jamais une décision
  automatique — la vérification finale reste humaine.
- Les droits contextuels fins évoqués au cahier des charges ("selon le
  contexte de l'affaire") : pour l'instant, les droits ne dépendent que du
  niveau (1/2/3) de la personne, pas encore de son rôle ni de l'affaire
  concernée. Chantier volontairement mis en pause : il touche qui a le
  droit de faire quoi, donc mieux vaut le cadrer précisément avant de
  coder plutôt que de deviner.
  - **Intitulés des niveaux** (`src/lib/niveaux.ts`, `LIBELLE_NIVEAU`) :
    Niveau 1 = "Exécutant", Niveau 2 = "Contrôleur technique", Niveau 3 =
    "Responsable" — affichés partout où le niveau apparaît (page
    Personnel, page d'accueil, sélecteur "Changer le niveau"). Purement
    une question de présentation : les droits eux-mêmes restent
    déterminés par `NIVEAU_1`/`NIVEAU_2`/`NIVEAU_3` partout ailleurs
    (`aNiveauMinimum`, `requireNiveau`), rien n'a changé côté accès.
- Autorisations de signature (voir le cahier des charges, fiche personne :
  "autorisations de signature" ; et "IDENTIFICATION ET SIGNATURE" :
  "contrôle des droits" fait partie du parcours de signature) : nouveau
  modèle `AutorisationSignature`, `GET`/`POST`/`PATCH
  /api/autorisations-signature`, section "Autorisations de signature" sur
  `/personnel` (accorder/révoquer réservé au niveau 3). Le contrôle est
  intégré dans `creerSignature()` (`src/lib/signature.ts`), le point de
  passage unique de toute signature, juste après le PIN et la charte —
  exactement l'ordre du cahier des charges ("identification → PIN →
  contrôle des droits → signature"). Comportement volontairement additif
  et non bloquant par défaut : tant qu'aucune autorisation n'a été
  configurée pour un type de document donné, le contrôle par niveau déjà
  en place sur chaque route continue de s'appliquer sans changement (voir
  `src/lib/autorisationsSignature.ts`) — accorder une première
  autorisation sur un type restreint alors ce type aux seules personnes
  nommées. Révoquer ne supprime jamais la ligne (`active` repasse à
  false, tracé par l'audit trail), et si plus aucune autorisation active
  n'existe pour un type après une révocation, ce type redevient ouvert à
  tous (comportement documenté, pas un bug) plutôt que de verrouiller
  l'entreprise hors de ses propres documents.
- La signature QR + PIN couvre maintenant la validation d'une reconduction,
  la confirmation de validité de qualification, les six types de
  contrôle et la fiche technique de suivi de soudage (voir ci-dessus).
- L'envoi à plusieurs destinataires réels : `RESEND_API_KEY` est
  configurée et l'envoi fonctionne (testé), mais `ALERTES_EMAIL_FROM`
  utilise encore l'adresse de test de Resend (`onboarding@resend.dev`),
  qui ne peut envoyer qu'à l'adresse associée à votre compte Resend. Pour
  envoyer à toute l'équipe, il faut vérifier votre propre nom de domaine
  dans Resend puis remplacer `ALERTES_EMAIL_FROM` par une adresse de ce
  domaine (ex. `alertes@votredomaine.fr`).
  La programmation "chaque lundi" (`vercel.json`) ne prend effet que si
  le projet est déployé sur Vercel ; sur un autre hébergeur, il faudra un
  déclencheur équivalent qui appelle `GET /api/alertes/recapitulatif`
  chaque semaine.
- "Contrôles manquants" (voir le cahier des charges, "ALERTES") est
  maintenant sur `/alertes` : `Affaire.controlesRequis` (section
  "Contrôles requis sur chaque joint", `/affaires/[id]/reglementaire`)
  déclare une seule fois quels types de contrôle (DIM/VT/PT/MT/RT/UT)
  sont exigés sur chaque joint d'origine de l'affaire, puis
  `src/lib/controlesManquants.ts` compare cette liste aux contrôles
  réellement enregistrés — additif comme les autres modules du même
  genre (`MatierePrevue`, `AutorisationSignature`) : une affaire n'ayant
  rien déclaré n'apparaît jamais dans cette alerte. "Documents manquants"
  fonctionne maintenant sur le même principe (`Affaire.documentsRequis`,
  voir `src/lib/documentsManquants.ts`) — seuls les "documents obsolètes"
  (une révision périmée dans la bibliothèque documentaire) restent hors
  de `/alertes`. "Validations niveau 3 en attente" couvre maintenant les
  reconductions de qualification proposées, les documents externes non
  validés (`DocumentExterne.valideConclusion`), les PV externes non
  revus (`PVExterne.revueConclusion`) et les demandes de modification de
  séquencement non tranchées — quatre états déjà modélisés,
  simplement pas remontés ici jusque-là. Le rapport de fin de fabrication
  n'y figure volontairement pas : rien ne permet aujourd'hui de
  distinguer une affaire réellement prête à valider d'une affaire encore
  en cours, et Weldoc ne devine jamais ce genre de seuil.
- Le dépôt de fichier (voir ci-dessus, `POST /api/upload`) couvre
  maintenant les certificats de qualification/habilitation/acuité
  visuelle, les documents justificatifs du personnel, le book photo
  général, les photos de pièce et les photos de fiche de suivi de
  soudage (voir plus bas) — le composant `FileUpload` reste réutilisable
  partout où un champ "lien vers un document" existe déjà.
- Quelques modules plus secondaires du cahier des charges restent encore à
  construire (offre documentaire Weldoc, formation/déploiement — plutôt
  des sujets d'offre commerciale que des écrans à construire). Le TQC
  ("tel que construit") est maintenant complet sur ses trois méthodes :
  texte + book photo, scan 3D, et ISO manuel au stylet (voir ci-dessus).
- Une vraie interface tablette soignée (ici, des pages HTML minimales) —
  le dessin au stylet fonctionne (testé au doigt/stylet/souris via les
  événements `pointer`), mais le reste de l'écran garde le style HTML
  minimal du squelette de démonstration.
- Les vraies valeurs de tolérances normatives, sauf l'EN 10216-2 (Tableaux
  7, 9, 11 — voir ci-dessus) : toute autre norme reste à intégrer au fil de
  l'eau, au fur et à mesure qu'un utilisateur ou un expert métier avec
  l'accès licencié la fournit.
- Les tests automatisés et le déploiement.

L'objectif de cette première étape était de valider que l'architecture
(modèle de données + moteur de règles + génération de FNC automatique) tient
la route, avant d'empiler les modules suivants.

## Comment le lancer (nécessite un ordinateur avec Node.js installé)

```bash
npm install
cp .env.example .env   # puis renseigner une vraie base PostgreSQL
npx prisma migrate dev --name init
npm run dev
```

L'application sera disponible sur http://localhost:3000

La page d'accueil demande maintenant une connexion. Pour créer le tout
premier compte (sur une base vide) :

```bash
# 1) créer une fiche personne (niveau 3 recommandé pour ce premier compte)
curl -X POST http://localhost:3000/api/personnel \
  -H "Content-Type: application/json" \
  -d '{"matricule":"ADMIN-001","nom":"...","prenom":"...","societe":"...","niveau":"NIVEAU_3"}'

# 2) créer son compte de connexion (l'id personnelId vient de l'étape précédente)
curl -X POST http://localhost:3000/api/auth/comptes \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"...","motDePasse":"..."}'
```

Ensuite, se connecter normalement sur http://localhost:3000/login avec ce
matricule et ce mot de passe.

## Prochaine étape recommandée

Continuer ce projet dans **Claude Code** (application desktop ou terminal),
qui permet de garder ce dépôt de code vivant sur la durée et de construire
les modules suivants un par un, avec de vrais tests à chaque étape — plutôt
que de repartir de zéro à chaque conversation de chat.
