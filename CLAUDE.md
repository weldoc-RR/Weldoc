# Instructions pour Claude Code — Projet Weldoc

## Contexte à lire en premier

Avant toute modification, lire `docs/cahier-des-charges.md` : c'est la vision
complète et la référence fonctionnelle du projet. Ne pas s'en écarter sans
en discuter avec l'utilisateur.

## Qui est l'utilisateur

L'utilisateur porteur de ce projet **n'a pas de connaissances techniques en
développement logiciel**. Toujours :
- expliquer en langage simple, sans jargon non expliqué ;
- proposer les choix techniques plutôt que de lui demander de choisir entre
  des options qu'il ne peut pas évaluer ;
- résumer en une phrase claire ce qui a été fait et pourquoi, à la fin de
  chaque session de travail.

## Stack technique retenue (ne pas changer sans discussion explicite)

- Next.js + TypeScript (frontend et backend dans le même projet)
- PostgreSQL, accédé via Prisma (voir `prisma/schema.prisma`)
- Validation des données avec Zod

## Principes de conception à respecter impérativement

1. **Une donnée n'est saisie qu'une seule fois** puis réutilisée partout
   (voir "PRINCIPE CENTRAL" et "PRINCIPE DE CONCEPTION" du cahier des
   charges). Ne jamais dupliquer une donnée dans le modèle sans raison.
2. **Rien n'est jamais écrasé** : qualifications, joints réparés (M800 →
   M800 R1 → M800 R2), documents — tout historique se fait par nouvel
   enregistrement, jamais par suppression/écrasement.
3. **L'IA (le moteur applicatif) assiste mais ne décide jamais seule** des
   points réglementaires ou de la reconduction d'une qualification — la
   validation finale reste humaine et tracée (personne, date, signature).
4. **Ne jamais reproduire le texte intégral de normes protégées**
   (EN 13480, ASME B31.3, etc.) dans le code ou la documentation — voir
   l'avertissement dans `src/lib/tolerances.ts`. Utiliser des valeurs
   placeholder clairement identifiées tant que les vraies valeurs
   normatives n'ont pas été fournies par l'utilisateur ou un expert métier.
5. **Chaque décision de conformité doit être traçable** vers une règle, un
   référentiel et une version précise.

## État actuel du projet

Voir `README.md` à la racine pour la liste de ce qui est fait et de ce qui
ne l'est pas encore. En résumé : le modèle de données du socle existe, ainsi
qu'une verticale fonctionnelle (affaire → joint → contrôle dimensionnel →
FNC automatique si hors tolérance). Le reste des ~50 modules du cahier des
charges reste à construire, module par module.

## Comment avancer

Construire un module à la fois (ex. CND, planning, personnel/qualifications
complet, authentification, dossier réglementaire...), en respectant le
modèle de données déjà en place et en l'étendant plutôt qu'en le
recommençant. Proposer à l'utilisateur, avant de coder, quel module traiter
ensuite et pourquoi.
