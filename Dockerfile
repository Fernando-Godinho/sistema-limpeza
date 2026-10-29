# Imagem do Sistema de Limpeza.
#
# Tres etapas: instalar dependencias, compilar o Next.js e montar a imagem final
# (que e a menor possivel e roda sem npm). O resultado e um servidor Node que
# escuta na porta 3000, com banco SQLite e fotos em /app/data.
#
# Na Easypanel:
#   - Build: Dockerfile (este arquivo), porta 3000.
#   - Volume: monte em /app/data. Sem isso o banco e as fotos somem a cada deploy.
#   - Variaveis: SESSION_SECRET (obrigatoria), TZ, DATABASE_URL e STORAGE_DIR
#     (opcionais; por padrao apontam para /app/data).

FROM node:22-bookworm-slim AS deps
WORKDIR /app

# O Prisma precisa do OpenSSL para baixar e rodar o motor do banco.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Nenhuma pagina consulta o banco na hora de compilar -- todas sao dinamicas --
# mas deixamos uma URL valida para o Prisma nao reclamar durante o build.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Ferramentas de linha de comando que a primeira subida usa: criar as tabelas
# (prisma) e ler a base de colaboradores em TypeScript (tsx). Ficam fora de
# /app para nao se misturar com as dependencias que o servidor ja traz.
RUN npm install --prefix /opt/tools --no-audit --no-fund --no-save prisma@6.19.3 tsx@4.20.3

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Sao_Paulo

# O Next em modo standalone ja carrega so as dependencias usadas pelo servidor.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# O Next copia o .env da maquina de build para a pasta standalone. Aqui as
# variaveis vem da Easypanel, entao esse arquivo nao pode existir na imagem
# (ele apontaria o banco para "dev.db", dentro do container, e nao para o volume).
RUN rm -f /app/.env /app/.env.*

# O que a primeira subida precisa: o schema, a base de colaboradores e os
# modulos que o script de importacao usa.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib/db.ts ./src/lib/db.ts
COPY --from=builder /app/src/lib/domain.ts ./src/lib/domain.ts
COPY --from=builder /app/src/lib/pin.ts ./src/lib/pin.ts
COPY --from=builder /app/src/lib/storage.ts ./src/lib/storage.ts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/data \
  && chown -R node:node /app/data /app/prisma

# O sistema roda sem privilegios. O volume montado em /app/data herda este dono.
USER node

# Banco e fotos vivem aqui: precisa ser um volume persistente.
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/entrar').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
