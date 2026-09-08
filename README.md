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
  dimensionnels. **Les valeurs sont un exemple factice** : il faut y intégrer
  les vraies tolérances de vos normes (avec les licences nécessaires) avant
  toute utilisation réelle. Le code est fait pour que chaque calcul reste
  traçable vers une norme et une version, comme demandé dans le cahier des
  charges.
- `src/app/api/` — points d'entrée de l'application :
  - `POST /api/personnel` — créer une fiche personne minimale (identité + niveau)
  - `POST /api/auth/comptes` — créer le compte de connexion d'une personne
    (le tout premier compte de l'entreprise s'amorce librement ; les suivants
    exigent d'être créés par une personne de niveau 3)
  - `POST /api/auth/login` — connexion (matricule + mot de passe)
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
  - `POST /api/demandes-sequencement` — demande de modification du
    séquencement par le terrain (phases concernées, motif, urgence,
    photo/document)
  - `POST /api/demandes-sequencement/[id]/decision` — accepte/refuse/
    demande une modification, réservé au niveau 3, tracé dans l'audit
    trail ; une demande ACCEPTEE lève le blocage d'ordre précisément pour
    les phases qu'elle liste
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
    chaque joint (`Joint.matiereId`) sans être ressaisie
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
    choisi, jamais ressaisi).
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
    conflits de planning (niveau 2 minimum)
  - `POST /api/affectations` — affecter une personne à une affaire (et
    éventuellement un joint précis). Vérifie compétence, qualification,
    habilitation et disponibilité, mais **ne bloque jamais** la création :
    les alertes sont renvoyées dans la réponse (et tracées dans l'audit
    trail s'il y en a), la décision de passer outre reste humaine, comme
    demandé au cahier des charges ("signale... peut proposer")
  - `GET /api/affaires/[id]/organigramme` — généré automatiquement à
    partir des rôles de l'affaire et des affectations actuellement
    actives ; rien n'est stocké séparément, donc toujours à jour par
    construction
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
- `src/lib/dossierFinFabrication.ts` — première version du rapport de fin
  de fabrication (voir le cahier des charges, qui précise qu'"un exemple
  réel sera fourni ultérieurement pour finaliser la structure" : cette
  version compile donc ce qui existe déjà — rien n'est ressaisi — plutôt
  que de figer une mise en page définitive). Rassemble, pour une affaire :
  organigramme, avancement, personnel intervenant (soudeurs et
  contrôleurs, avec leurs qualifications expirées/suspendues), WPS/QMOS et
  consommables CND utilisés, joints (avec chaîne de réparation et dernier
  résultat par méthode de contrôle), FNC, et une liste d'éléments
  manquants signalés (contrôle visuel absent, FNC non clôturée,
  qualification expirée ou suspendue) — un signalement indicatif, jamais
  un blocage décidé par Weldoc.
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
    "Définir le code PIN" sur `/personnel`.
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
- `src/app/alertes/page.tsx` — outils bientôt à échéance ou expirés, et
  bibliothèque des destinataires du récapitulatif hebdomadaire par email.
- `src/app/pieces/page.tsx` — prise en charge de pièces (atelier) et suivi
  de leur statut.
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
- `src/lib/verificationQS.ts` — rapproche les qualifications soudage
  actives d'un soudeur avec le domaine d'un WPS (procédé, groupe de
  matériaux, épaisseur, diamètre), pour aider à vérifier qu'il est bien
  qualifié avant soudage. Purement indicatif, jamais bloquant : affiché
  comme alerte sur `/joints` (créer un joint, ou consulter un joint
  existant, avec soudeur ET WPS renseignés) et exposé en API via
  `GET /api/qualifications/verification-qs?personnelId=...&wpsId=...`.
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
- La gestion des `Referentiel` (créer/lister un code de norme comme "EN
  ISO 9606-1") n'a pas encore de page ni de route API dédiées : le modèle
  existe et peut être lié à une affaire ou une qualification, mais pour
  l'instant seule une personne ayant accès à la base peut y ajouter une
  ligne.
- Les autorisations de signature et les documents justificatifs attachés
  au personnel (mentionnés au cahier des charges, pas encore modélisés).
- Les droits contextuels fins évoqués au cahier des charges ("selon le
  contexte de l'affaire") : pour l'instant, les droits ne dépendent que du
  niveau (1/2/3) de la personne, pas encore de son rôle ni de l'affaire
  concernée.
- Les autorisations de signature (qui a le droit de signer quel type de
  document) restent implicites : le parcours QR/matricule + PIN + charte
  (voir ci-dessus) identifie et authentifie la personne, mais Weldoc ne
  vérifie pas encore qu'elle a le droit de signer ce document précis
  au-delà du niveau requis pour l'action elle-même.
- La signature QR + PIN couvre maintenant la validation d'une reconduction,
  la confirmation de validité de qualification et les six types de
  contrôle (voir ci-dessus). Il reste la fiche technique de soudage
  (`FicheTechniqueSoudage`, qui a bien un champ `signatureId` dans le
  modèle) : pas encore d'API ni d'écran de saisie du tout pour elle.
- La proposition automatique d'affectation adaptée en cas d'alerte
  (le cahier des charges évoque "peut proposer une affectation adaptée") :
  pour l'instant Weldoc détecte et signale, mais ne suggère pas encore
  d'alternative.
- La bibliothèque des produits normalisés ("bibliothèque dimensionnelle" du
  cahier des charges : tubes/tôles/raccords/brides avec leurs tolérances) :
  distincte des matières effectivement réceptionnées (`Matiere`), pas
  encore modélisée.
- L'import du CCPU et la reconnaissance de caractères sur étiquette
  (consommables comme matières) : pour l'instant les URLs de documents se
  renseignent à la main.
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
- Les autres types d'alertes évoqués au cahier des charges (qualifications
  à échéance, habilitations expirées, FNC ouvertes, validations niveau 3
  en attente...) : `/api/alertes` couvre l'outillage et les confirmations
  de validité de qualification périodiques, mais pas encore les
  échéances finales de qualification/habilitation ni les FNC ouvertes ;
  l'information existe déjà ailleurs (`statutCalcule` sur chaque fiche)
  mais n'est pas encore centralisée ici.
- L'adaptation complète à la fabrication en atelier : le cahier des
  charges est écrit en vocabulaire "chantier" (organigramme chantier,
  prise en charge du chantier...). `Affaire.typeRealisation`
  (`CHANTIER`/`ATELIER`), `chantier`/`site` facultatifs, et la prise en
  charge de pièces (`Piece`) existent, mais le lien entre une pièce et les
  joints/contrôles qui la concernent au fil de la fabrication n'est pas
  encore modélisé — pour l'instant `Piece` et `Joint` restent deux objets
  indépendants.
- L'upload réel de photos : `Piece.photosUrls`, `FicheTechniqueSoudage.photosUrls`
  et maintenant le modèle `Photo` (book photo) attendent tous des URLs déjà
  hébergées quelque part, il n'y a pas encore de téléversement de fichier
  intégré à Weldoc.
- L'avancement (`/avancement`) reste au niveau des phases du séquencement,
  pas encore joint par joint (ex. "38 joints soudés sur 120 prévus") : ça
  suppose de connaître à l'avance le nombre de joints prévus sur l'affaire,
  ce qui n'est pas encore saisi dans Weldoc.
- L'essentiel des ~50 modules du cahier des charges (REX, etc.). Le book
  photo a une première version (voir ci-dessus), mais pas le TQC ("tel que
  construit") lui-même : les trois méthodes prévues au cahier des charges
  (ISO manuel au stylet sur tablette, ISO issu d'un scan 3D externe, book
  photo pour localiser/identifier les soudures) restent à construire au-delà
  du book photo — l'annotation au stylet et l'intégration d'un scan 3D sont
  des chantiers UI/technique nettement plus lourds que ce qui a été fait
  jusqu'ici.
- Une vraie interface tablette soignée (ici, des pages HTML minimales).
- Les vraies valeurs de tolérances normatives (voir avertissement ci-dessus).
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
