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
  - `POST /api/affaires` — créer une affaire (authentification requise)
  - `POST /api/joints` — créer un joint (numérotation automatique,
    authentification requise)
  - `POST /api/controles-dimensionnels` — réaliser un contrôle (le
    contrôleur est automatiquement la personne connectée), avec ouverture
    automatique de FNC si hors tolérance
  - `PATCH /api/fnc` — faire avancer le workflow d'une FNC ; faire passer
    une FNC en VALIDATION ou CLOTUREE est réservé au niveau 3 et
    enregistré dans l'audit trail (traçabilité de la décision de validation)
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
    réutilisés sur chaque PV
  - `POST /api/controles-magnetoscopie`, `POST /api/controles-radiographie`,
    `POST /api/controles-ultrasons` — MT/RT/UT, même principe que le
    contrôle visuel (résultat déduit des indications, FNC automatique si
    non conforme). Pas de bibliothèque de consommables pour ces trois-là
    dans cette première version (voir plus bas).
- `src/lib/qualifications.ts` — quand un soudeur réalise un joint, Weldoc
  vérifie si l'une de ses qualifications soudage arrive à échéance et, le
  cas échéant, propose automatiquement une reconduction (avec le joint
  comme preuve) — sans jamais la valider lui-même. **Limite assumée** :
  seule l'échéance est vérifiée pour l'instant, pas encore la
  correspondance fine procédé/matériaux du joint avec le domaine de
  validité de la qualification (le modèle Joint n'a pas encore de champ
  "procédé" structuré) — chaque proposition reste donc à vérifier par la
  personne qui valide.
- `src/lib/auth.ts` — briques d'authentification : mots de passe (hachés,
  jamais stockés en clair), sessions côté serveur (révocables
  immédiatement, par ex. si un compte est suspendu), vérification du
  niveau d'accès requis pour une action.
- `src/app/login/page.tsx` — page de connexion.
- `src/app/page.tsx` — page d'accueil listant les affaires (accès
  réservé aux personnes connectées).
- `src/app/personnel/page.tsx` — liste du personnel, ses fonctions et le
  statut de ses qualifications.
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

- La correspondance fine entre l'activité d'un joint (procédé, matériaux,
  diamètre) et le domaine de validité d'une qualification, pour la
  proposition automatique de reconduction (voir la limite assumée
  ci-dessus) : il faudra structurer ces champs sur Joint.
- Les autorisations de signature et les documents justificatifs attachés
  au personnel (mentionnés au cahier des charges, pas encore modélisés).
- Les droits contextuels fins évoqués au cahier des charges ("selon le
  contexte de l'affaire") : pour l'instant, les droits ne dépendent que du
  niveau (1/2/3) de la personne, pas encore de son rôle ni de l'affaire
  concernée.
- L'identification QR + PIN pour la signature de documents (distincte de la
  connexion à l'application) : le champ `pinHash` existe sur Personnel mais
  n'est pas encore utilisé.
- La bibliothèque de consommables pour MT/RT/UT (elle n'existe que pour
  le ressuage) : leur traçabilité porte surtout sur l'équipement, la
  source ou le film, pas encore couverte.
- L'essentiel des ~50 modules du cahier des charges (TQC, planning,
  rapports de fin de fabrication, dossier réglementaire, REX, etc.).
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
