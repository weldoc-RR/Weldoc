import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { ProxyAgent, setGlobalDispatcher } from "undici";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Si l'environnement d'exécution passe par un proxy sortant (variable
// HTTPS_PROXY, absente en production), on le respecte pour les requêtes
// HTTPS faites par le driver Neon. Sans HTTPS_PROXY, ceci ne fait rien.
const httpsProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
if (httpsProxy) {
  setGlobalDispatcher(new ProxyAgent(httpsProxy));
}

// Connexion via l'API HTTPS de Neon plutôt qu'une connexion PostgreSQL TCP
// directe : nécessaire pour les environnements dont la sortie réseau n'autorise
// que du trafic HTTPS (voir prisma.config.ts pour la connexion TCP classique
// utilisée par la CLI Prisma / les migrations).
//
// Limite importante : ce pilote HTTP ne supporte PAS prisma.$transaction
// (ni la forme "callback", ni la forme tableau), ni tout ce qui utilise une
// transaction en interne — écritures imbriquées (create avec un "create"
// sur une relation) et .upsert() inclus. Chaque requête HTTP est
// indépendante. Quand plusieurs écritures doivent rester cohérentes, les
// faire séquentiellement (écrire d'abord le fait historique/l'événement,
// puis mettre à jour l'état courant), et remplacer upsert() par un
// find + create manuel.
const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
