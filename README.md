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
  - `POST /api/affaires` — créer une affaire
  - `POST /api/joints` — créer un joint (numérotation automatique)
  - `POST /api/controles-dimensionnels` — réaliser un contrôle, avec
    ouverture automatique de FNC si hors tolérance
  - `PATCH /api/fnc` — faire avancer le workflow d'une FNC
- `src/app/page.tsx` — page d'accueil minimale listant les affaires.
- `prisma.config.ts` — configuration Prisma (schéma, migrations) : utilise
  `DATABASE_URL` en connexion PostgreSQL classique, utilisée par la CLI
  (`prisma migrate`, etc.).
- `src/lib/prisma.ts` — connexion de l'application à la base : passe par le
  pilote HTTPS de Neon (`@prisma/adapter-neon` + `@neondatabase/serverless`)
  plutôt qu'une connexion PostgreSQL TCP classique. Utile si l'hébergement
  de l'application n'autorise que du trafic HTTPS sortant (certains
  environnements cloud restreints). Fonctionne aussi normalement partout
  ailleurs.

## Ce qui n'est PAS encore fait (volontairement)

- L'authentification réelle (comptes, rôles, droits par niveau).
- L'essentiel des ~50 modules du cahier des charges (CND, TQC, planning,
  rapports de fin de fabrication, dossier réglementaire, REX, etc.).
- Une vraie interface tablette soignée (ici, une page HTML minimale).
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

## Prochaine étape recommandée

Continuer ce projet dans **Claude Code** (application desktop ou terminal),
qui permet de garder ce dépôt de code vivant sur la durée et de construire
les modules suivants un par un, avec de vrais tests à chaque étape — plutôt
que de repartir de zéro à chaque conversation de chat.
