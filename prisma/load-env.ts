import path from "node:path";

// Carrega o .env quando o seed roda direto pelo tsx, fora do comando do Prisma.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Sem .env: seguimos com as variaveis ja definidas no ambiente.
}
