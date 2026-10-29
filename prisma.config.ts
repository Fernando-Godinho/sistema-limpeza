import path from "node:path";

import { defineConfig } from "prisma/config";

// Com um arquivo de configuracao o Prisma nao le mais o .env sozinho,
// entao carregamos aqui com o proprio Node (disponivel no Node 22).
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Sem arquivo .env: seguimos com o que ja estiver no ambiente.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
