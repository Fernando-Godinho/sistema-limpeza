import "./load-env";

import { demoPinSummary, resetSampleData } from "../src/lib/sample-data";

async function main() {
  console.log("Criando os dados de exemplo do sistema de limpeza...");
  await resetSampleData();
  console.log("Pronto. Estas sao as pessoas e os PINs de demonstracao:\n");
  for (const line of demoPinSummary()) {
    console.log(`  ${line}`);
  }
  console.log("\nTroque todos os PINs antes de usar o sistema de verdade.");
}

main()
  .catch((error) => {
    console.error("Nao foi possivel criar os dados de exemplo:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
