# WELDOC — VISION, PÉRIMÈTRE FONCTIONNEL ET BASE DE CONCEPTION

> Ce document est la référence complète du projet. Toute session de travail
> sur ce dépôt (avec Claude Code ou un développeur humain) doit le lire
> d'abord pour comprendre la vision globale avant de modifier le code.

## OBJECTIF GÉNÉRAL

Weldoc est une application cloud accessible principalement sur tablette et ordinateur, destinée aux entreprises réalisant des travaux de fabrication, de soudage, de tuyauterie, d'équipements sous pression, de maintenance industrielle et, à terme, à différents secteurs industriels.

L'objectif est de disposer d'un outil unique permettant de préparer, prescrire, planifier, réaliser, contrôler, tracer et clôturer une intervention ou une fabrication, tout en générant automatiquement les différents dossiers documentaires nécessaires.

Weldoc doit être plus qu'un générateur de PDF : il doit constituer un véritable système de suivi de fabrication, de qualité, de traçabilité et de gestion documentaire.

## PRINCIPE CENTRAL

Une donnée ne doit être saisie qu'une seule fois.

Toutes les informations doivent être liées entre elles et réutilisées automatiquement.

Exemple : un tube réceptionné avec son CCPU, sa nuance, son diamètre, son épaisseur, sa finition et son numéro de coulée est enregistré une seule fois, puis réutilisé automatiquement dans le contrôle matière, le contrôle dimensionnel, les dossiers de soudage, les CND, la traçabilité des joints, le dossier réglementaire, le rapport d'intervention, le rapport de fin de fabrication et les annexes documentaires.

## STRUCTURE GÉNÉRALE

Entreprise · Utilisateurs et droits · Personnel · Qualifications et habilitations · Formation · Acuités visuelles · Bibliothèque documentaire · Procédures internes · Référentiels/codes/normes · Affaires · Chantiers · Équipements · Lignes · Spools/ensembles · Matières et approvisionnements · CCPU et certificats matière · Consommables · Outillages et métrologie · Planning · Organigramme chantier · Séquences et phases · Joints de soudage · WPS/DMOS · QMOS · QS · Fiches techniques de soudage · Contrôles visuels · Contrôles dimensionnels · CND · PV externes · FNC · Remise en conformité/réparations · TQC · Book photographique · 3D/scans · Dossier réglementaire · Rapport d'intervention · Rapport de fin de fabrication · Système qualité · Audit trail/historique · Retour d'expérience (REX) · Formation et accompagnement au déploiement · Offre documentaire · Offre commerciale/ROI.

## PERSONNEL

Bibliothèque centrale du personnel : chaque personne créée une seule fois, plusieurs fonctions possibles (soudeur, contrôleur, contrôleur CND, chargé de travaux, contremaître, chargé d'affaires, coordinateur soudage, ingénieur soudage, ingénieur, responsable qualité, exécutant, vérificateur, autres configurables).

Niveaux de décision (distincts des rôles) :
- Niveau 1 : exécutant.
- Niveau 2 : chargé de travaux / contrôle intermédiaire selon autorisation.
- Niveau 3 : pouvoir de décision et de modification documentaire, configurable par l'entreprise (coordinateur soudage, ingénieur soudage, ingénieur, responsable désigné).

Fiche personne : identité, matricule, société, fonction(s), rôle(s), niveau, autorisations, habilitations, qualifications soudage/CND, formations, acuités visuelles, certifications, autorisations de signature, documents justificatifs, dates de validité, échéances, historique. Statuts visibles : valide, bientôt à échéance, expiré, en renouvellement, suspendu.

## QUALIFICATIONS ET RECONDUCTION

QS conservée avec : référence, norme, procédé, matériaux, domaines de validité, épaisseurs, diamètres, positions, assemblages, dates, certificat, historique, reconductions. Une qualification n'est jamais écrasée : chaque renouvellement est un nouvel événement historisé.

Weldoc suit automatiquement les activités : quand un soudeur réalise un joint, le système vérifie si cela peut constituer une preuve pour le maintien/reconduction de sa qualification. Il détecte les activités pertinentes, rassemble les preuves, prépare le dossier, alerte la personne compétente, soumet à validation — mais ne décide jamais seul qu'une qualification est reconduite ; la validation reste faite par une personne habilitée.

## IDENTIFICATION ET SIGNATURE

Identité numérique nominative par intervenant. QR code personnel pour identification rapide (caméra tablette ou douchette), mais le QR seul n'est jamais une signature sécurisée (prêtable/copiable).

Pour signer : identification QR → authentification personnelle (PIN) → contrôle des droits → signature → horodatage → conservation de l'identité et de la version du document signé.

Une charte d'utilisation et d'intégrité, versionnée et signée électroniquement, doit être acceptée avant toute signature de document ; elle doit pouvoir être réacceptée à chaque nouvelle version.

## AFFAIRE

Conteneur principal, créé avec : numéro d'affaire, client, projet, chantier, site, responsable, chargé d'affaires, coordinateur soudage, dates, cahier des charges, plans, exigences client, codes et normes applicables, spécifications, procédures internes, exigences réglementaires. Plusieurs référentiels peuvent s'appliquer simultanément.

## RÉFÉRENTIELS, CODES ET NORMES

Domaines : tuyauterie industrielle, ESP, nucléaire, structures métalliques, aéronautique, naval, maintenance industrielle, autres. Référentiels exemples : EN 13480, EN 13445, ISO 3834, ISO 15614, ISO 9606, CODAP, CODETI, RCC-M, RSE-M, RCC-MRx, ASME B31.3, AWS D1.1, AWS D17.1, EN 4179, règles BV/DNV/LR, spécifications client, procédures internes. L'architecture doit permettre d'ajouter de nouveaux référentiels sans réécrire l'application.

Important : Weldoc ne doit jamais devenir une copie illégale de normes protégées. Privilégier règles structurées, références précises, versions, dates d'application, exigences applicables, sources autorisées, documents sous licence lorsque nécessaire — produire les prescriptions opérationnelles sans redistribuer systématiquement le texte intégral ou des extraits protégés.

## MOTEUR DE CONFORMITÉ

À partir du cahier des charges et des données techniques (matériau, diamètre, épaisseur, type d'assemblage, procédé...), Weldoc détermine les exigences applicables : WPS, QMOS, QS, niveau de qualité, CND, critères dimensionnels, contrôles complémentaires. Il produit exigences, prescriptions, contrôles à effectuer, documents nécessaires, qualifications nécessaires, éventuels blocages. Chaque décision importante doit être traçable vers une règle/référentiel/version/spécification/procédure. L'IA peut assister la recherche/préparation/explication mais ne doit jamais prendre seule une décision réglementaire opaque.

## APPROVISIONNEMENTS ET MATIÈRES

Pour chaque matière : fournisseur, désignation, norme produit, nuance, diamètre, épaisseur, finition, état, numéro de coulée, numéro de lot, référence, CCPU, certificat, documents associés. Le CCPU peut être importé. Ces informations sont liées aux joints, contrôles et dossiers réglementaires.

## BIBLIOTHÈQUE DIMENSIONNELLE

Bibliothèque des produits normalisés (tubes, tôles, raccords, brides, pièces...) avec norme produit, diamètre, épaisseur, finition, état, classe/type, tolérances applicables, critères dimensionnels — évolutive avec les référentiels.

## SÉQUENCES ET PHASES

Dossier de fabrication constitué de séquences (blocs de phases), par défaut chronologiques : 1) prise en charge, 2) préparation, 3) soudage et contrôles, 4) remise en conformité/finalisation, 5) vérification finale. Phases obligatoires, optionnelles, ou N/A avec justification. Par défaut une séquence suivante ne peut démarrer avant la précédente, mais un séquencement adapté est possible (prévu à la préparation, ou décidé en cours de réalisation).

### Demande de modification par le terrain

L'intervenant peut sélectionner des phases, expliquer le motif, joindre photo/document, préciser l'urgence, envoyer la demande — transmise automatiquement au niveau 3 désigné, qui accepte/refuse/demande modification/impose des conditions. La décision est identifiée, datée, signée, historisée. Le dossier conserve séquencement initial, demande, justification, décision, nouveau séquencement, actions réalisées.

## PRISE EN CHARGE ET RESTITUTION DU CHANTIER

Prise en charge en début d'intervention : état des lieux, identification de zone, photos, book photo, constat de dégradations, réserves, observations, documents d'entrée, signature. En cas de problème : réserve, fiche d'aléa, ou FNC, transmissibles au client.

Restitution en fin d'intervention : nouvel état des lieux, comparaison photos/observations initiales et finales, génération d'un document démontrant l'état initial et final (utile pour justifier qu'une dégradation préexistait).

## CONTRÔLE VISUEL ET DIMENSIONNEL

Contrôle visuel : procédure applicable (référence, version, critères), PV à compléter, pièces jointes ; le contrôleur saisit résultats/observations/indications/conformité/photos/commentaires puis signe.

Contrôle dimensionnel : PV généré automatiquement selon produit/norme/diamètre/épaisseur/finition/matière/CCPU/tolérances. Exemple tube Ø163 mm : le système détermine diamètre nominal/mini/maxi, épaisseur mini/maxi, autres critères. Mesures possibles à plusieurs positions (0°, 90°, 180°, 270°), saisies dans le PV. Comparaison automatique aux critères : conforme / hors tolérance / à vérifier.

## CND

Même architecture pour VT, PT/ressuage, MT/magnétoscopie, RT/radiographie, UT/ultrasons, contrôles dimensionnels, autres méthodes — chacune avec sa propre structure de données et ses critères.

### Indications CND

Une indication (localisation, dimensions, nature, caractéristique, critère applicable, comparaison, conforme/non conforme, commentaire, photo) n'est pas nécessairement une non-conformité. Une indication conforme reste documentée ; une indication hors critères peut déclencher une FNC.

### Consommables CND

PV permettant de renseigner facilement les produits utilisés (ex. ressuage : pénétrant, révélateur, nettoyant, fabricant, référence, lot, péremption, certificat). Bibliothèque des consommables ; possibilité de photographier l'étiquette avec reconnaissance de caractères pour proposer automatiquement référence/lot/péremption/fabricant (le contrôleur valide, la photo originale est conservée comme preuve).

## MÉTROLOGIE ET OUTILLAGE

Fiche par outil : référence, numéro, type, fabricant, numéro de série, date de vérification, échéance, statut, certificat, documents, QR code. Lors d'une mesure : scan du QR → identification de l'outil → vérification de validité → rattachement automatique au PV. Si le QR ne fonctionne pas : recherche par référence/numéro de série/nom, sélection manuelle. Si introuvable : alerte, création éventuelle, validation selon les droits.

## PV EXTERNES

Documents de prestataires externes importés, liés à l'affaire/joint/zone/contrôle, historisés. Revue par une personne habilitée (niveau 3 si requis) pour vérifier le respect des exigences ; revue tracée.

## FNC

Objets natifs avec référence unique, liables à affaire/chantier/fournisseur/phase/joint/contrôle/matière/document/équipement. Workflow : détection → description → preuves → analyse → décision → action corrective → réalisation → contrôle → validation → clôture. Impact : bloquante, non bloquante, réglementairement sensible, ou sans impact. Une FNC bloquante empêche la poursuite de la phase concernée tant que la condition de déblocage n'est pas remplie.

## REMISE EN CONFORMITÉ

Actions possibles : réparation, meulage, resurfaçage, reprise, remplacement, contrôle complémentaire. La réparation reste liée au joint initial, qui n'est jamais écrasé (ex. M800, M800 R1, M800 R2) — historique complet conservé.

## JOINTS DE SOUDAGE

Numérotation automatique commençant à M800 (M800, M801, M802...). Informations : ligne, spool, type de joint, DN, diamètre, épaisseur, matériaux, préparation, WPS/DMOS, QMOS, soudeur, QS, consommable, lot, paramètres, énergie, nombre de passes, temps, contrôles, CND, réparations, FNC, photos, documents, signatures.

## FICHE TECHNIQUE DE SUIVI DE SOUDAGE

Identification du joint, soudeur, QS, WPS/DMOS, QMOS, procédé, consommable, lot, diamètre, épaisseur, nombre de passes, préchauffage, température interpasses, postchauffage, paramètres (tension, intensité, vitesse, énergie, temps), observations, interruptions, reprises, photos, signature. (Un exemple réel de fiche sera intégré ultérieurement pour finaliser tous les champs.)

## TEMPS ET PRODUCTIVITÉ

Distinguer temps théorique, prévu, réel. Utiliser des statistiques robustes (médianes, percentiles) sur des configurations comparables — éviter de classer les soudeurs uniquement sur leur vitesse.

## PLANNING

Connecté au personnel, qualifications, habilitations, disponibilités, travaux, joints, durées estimées. Avant affectation, vérification de compétence/qualification/validité/habilitation/disponibilité. Signale qualification expirée ou proche échéance, conflit de planning, indisponibilité, compétence manquante ; peut proposer une affectation adaptée.

## ORGANIGRAMME CHANTIER

Généré automatiquement à partir des rôles, affectations, responsabilités, niveaux, délégations ; mis à jour à chaque modification pertinente du chantier.

## TQC (TEL QUE CONSTRUIT)

Trois méthodes combinables : ISO manuel sur tablette (stylet), ISO issu d'un scan 3D externe, book photo pour localiser/identifier les soudures. Doit permettre localisation des soudures, références M800/M801, équipements, supports, dimensions, écarts, observations, photos. Document final généré automatiquement et relié aux joints.

### Scan 3D

Conserve fichier source, date, opérateur, zone, logiciel/version, fichier généré, ISO/TQC résultant. Fonction complémentaire, non obligatoire.

## BOOK PHOTO

Photos horodatées, rattachées à l'affaire/phase/joint, annotables, commentables — utilisées pour prise en charge, suivi, contrôles, FNC, TQC, restitution.

## DOSSIER RÉGLEMENTAIRE

Construit automatiquement en parallèle du dossier de fabrication, alimenté par les données déjà saisies (ex. CCPU → disponible automatiquement). Éléments manquants signalés. Soumis à un service d'inspection reconnu, organisme habilité, ou autre organisme compétent selon le projet.

### Blocage réglementaire

Statuts : non bloquant, bloquant, sous réserve, attente décision, déblocage autorisé. Un point bloquant empêche la poursuite de la partie concernée tant que les conditions de déblocage ne sont pas remplies.

## RAPPORT D'INTERVENTION

Généré automatiquement : identification, personnes présentes, organigramme, travaux réalisés, phases, contrôles, FNC, événements, photos, documents, réserves, observations.

## RAPPORT DE FIN DE FABRICATION

Compilation automatique : informations de l'affaire, planning, personnel, qualifications, habilitations, procédures, matières, CCPU, joints, WPS, QMOS, QS, fiches de soudage, consommables, contrôles, CND, PV externes, FNC, réparations, TQC, photos, dossier réglementaire, validations, signatures, annexes. (Un exemple réel sera fourni ultérieurement pour finaliser la structure.)

### Validation de fin de fabrication

PV synthétisant périmètre, référentiels, travaux réalisés, contrôles, résultats, FNC, réparations, TQC, documents réglementaires, réserves — signé par une personne habilitée. Weldoc ne se substitue pas à un organisme réglementaire ou une certification externe.

## SYSTÈME QUALITÉ

Soutien au système qualité de l'entreprise : maîtrise documentaire, gestion des versions, traçabilité, preuves de compétence, signatures, gestion des FNC, actions correctives, enregistrements, audit trail, historique, contrôles, validation — fournit des preuves structurées pour les audits ISO 9001, sans « certifier » l'entreprise.

## DOCUMENTATION ET PROCÉDURES INTERNES

Chaque phase peut être liée à une procédure interne/instruction/formulaire/PV/fiche technique, avec référence, titre, version, statut, document applicable. La version réellement utilisée à l'exécution est conservée dans l'historique.

## OFFRE DOCUMENTAIRE WELDOC

Deux options : (A) l'entreprise utilise ses propres procédures, intégrées et référencées ; (B) Weldoc accompagne la création/structuration des procédures (contrôle visuel, dimensionnel, ressuage, magnétoscopie, radiographie, ultrasons, suivi soudage, formulaires, PV, instructions), soumises à validation de l'entreprise puis utilisées automatiquement dans les phases correspondantes. Prestation vendable en option.

## DOCUMENTS EXTERNES ET BIBLIOTHÈQUE DOCUMENTAIRE

Intégration de documents de fournisseurs/sous-traitants/prestataires CND ou traitement thermique/organismes externes, liés aux éléments concernés. GED avec classement, versions, métadonnées, dates, auteur, validateur, statut, liens avec affaires/joints/phases/FNC/personnel/équipements — un document n'est jamais téléchargé plusieurs fois pour plusieurs usages.

## RETOUR D'EXPÉRIENCE (REX)

Les FNC et problématiques alimentent une base de REX, classée par type de problème, origine, matériau, procédé, fournisseur, type de joint, chantier, cause, solution, résultat. À terme, identification de problématiques similaires et propositions de solutions déjà rencontrées ; l'IA peut assister cette recherche mais les recommandations doivent rester identifiables comme telles, non comme décisions réglementaires.

## ALERTES

Qualifications à échéance, habilitations expirées, documents obsolètes, FNC ouvertes, blocages, validations niveau 3 en attente, dossiers réglementaires incomplets, contrôles manquants, outils métrologiques expirés, documents manquants.

## AUDIT TRAIL

Toute modification sensible historisée : utilisateur, date, heure, ancienne/nouvelle valeur, motif, validation, signature si nécessaire. L'historique n'est jamais supprimé.

## DROITS ET MODIFICATIONS

Droits définis par rôle, niveau, qualification, autorisation, contexte de l'affaire. Niveau 1 : exécution/saisie/signature des actions autorisées. Niveau 2 : réalisation/contrôle/validation intermédiaire selon autorisation. Niveau 3 : validation critique, modification documentaire, gestion des dérogations, modification du séquencement, validation de FNC, décisions définies par l'entreprise. Un niveau 3 ne supprime jamais l'historique ; toute évolution crée une nouvelle version ou un nouvel événement.

## FORMATION ET DÉPLOIEMENT / OFFRE COMMERCIALE ET ROI

Offre commerciale dédiée : présentation, paramétrage, import des données, intégration des procédures, formation (utilisateurs, administrateurs, responsables qualité), accompagnement démarrage/chantier, suivi de prise en main. Brique commerciale ROI : coût actuel de la gestion documentaire, temps passé, ressaisies, erreurs, retards, pertes documentaires, temps de recherche, coûts FNC/non-qualités, gains potentiels, temps économisé, amélioration traçabilité, réduction erreurs, amélioration suivi, ROI estimé.

## ARCHITECTURE TECHNIQUE ENVISAGÉE

Application web cloud responsive (tablette, ordinateur, smartphone si pertinent). Frontend : application web moderne. Backend : API, logique métier, moteur de conformité, génération documentaire. Base de données : relationnelle centralisée. Stockage : documents, photos, certificats, PV, plans, scans. Authentification : comptes nominatifs, rôles, droits, PIN pour signatures, QR code pour identification rapide. Développement : GitHub, Codex, environnement cloud. Les choix techniques définitifs doivent être arrêtés avant le développement du MVP.

**Décision prise pour ce projet : TypeScript / Next.js (frontend + backend) + PostgreSQL (via Prisma).**

## MVP

Ne pas tout développer immédiatement. Le premier MVP doit permettre de réaliser une affaire complète de bout en bout (scénario en 35 étapes : création affaire → import cahier des charges → référentiels → prise en charge chantier → approvisionnements/CCPU → matières → personnel → qualifications → planning → organigramme → séquences/phases → joints M800.. → affectation soudeurs → vérification QS/WPS/QMOS → soudage → fiche de suivi → contrôle visuel → contrôle dimensionnel → scan outillage → CND → consommables → photos → gestion indication → FNC si nécessaire → remise en conformité → nouveau contrôle → TQC → rapport d'intervention → dossier réglementaire → vérification niveau 3 → validation finale → rapport de fin de fabrication → export du dossier final).

## PRINCIPE DE CONCEPTION

« La donnée suit le chantier. » L'utilisateur ne doit jamais recopier plusieurs fois la même information ; une donnée saisie alimente automatiquement tous les documents et processus qui en ont besoin.

## ÉVOLUTION FUTURE

IA d'assistance documentaire, extraction automatique depuis certificats (OCR), scan QR, analyse de photos, recommandations REX, comparaison initial/final par scan 3D, statistiques de productivité, optimisation planning, nouveaux secteurs métiers, nouveaux codes/normes, portail fournisseurs, échanges clients/organismes externes. Architecture modulaire dès le départ pour ne pas nécessiter de reconstruire l'application à chaque ajout.

## POSITIONNEMENT

« Une plateforme de préparation, de réalisation, de contrôle, de traçabilité et de constitution des dossiers de fabrication et réglementaires pour les travaux industriels. » Accompagné, si nécessaire, de prestations complémentaires : coordination soudage, création/intégration documentaire, formation, accompagnement déploiement, paramétrage, conseil, amélioration continue, exploitation du REX.

Le logiciel ne remplace pas les responsabilités réglementaires, les personnes habilitées, les organismes d'inspection ou de certification. Il fournit les outils, les règles configurées, les preuves et la traçabilité nécessaires pour sécuriser et structurer le processus.
