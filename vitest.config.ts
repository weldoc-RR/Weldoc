import { defineConfig } from "vitest/config";
import path from "path";

// Tests unitaires (npm test) sur les fonctions de calcul/décision pures de
// src/lib — celles qui ne dépendent pas de la base de données, ou dont la
// dépendance (@/lib/prisma) est simulée dans le test (voir
// src/lib/aptitudePersonnel.test.ts). Pas de tests contre la vraie base :
// voir le README, section "Tests automatisés", pour ce choix.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
