#!/bin/sh
#
# Primeira coisa que roda no container.
#
# O sistema guarda tudo em dois lugares no disco: o banco SQLite e as fotos.
# Os dois ficam em /app/data, que precisa ser um volume na Easypanel -- se nao
# for, cada deploy comeca com o banco vazio.
#
# O que este script faz, em ordem:
#   1. decide onde ficam o banco e as fotos;
#   2. cria as tabelas que faltarem (o projeto usa db push, nao migrations);
#   3. na primeira subida, coloca a base de colaboradores para dentro;
#   4. liga o servidor.
#
# Variaveis que mudam o comportamento:
#   DATABASE_URL    caminho do banco (padrao: file:/app/data/limpeza.db)
#   STORAGE_DIR     pasta das fotos (padrao: /app/data/storage)
#   IMPORTAR_BASE   1 = importa a planilha de novo (sobrescreve nome/turno)
#   PORT            porta do servidor (padrao: 3000)
#   SESSION_SECRET  segredo do cookie de sessao -- defina na Easypanel

set -eu

APP_DIR="${APP_DIR:-/app}"
TOOLS_DIR="${TOOLS_DIR:-/opt/tools}"
DATA_DIR="${DATA_DIR:-$APP_DIR/data}"

export DATABASE_URL="${DATABASE_URL:-file:$DATA_DIR/limpeza.db}"
export STORAGE_DIR="${STORAGE_DIR:-$DATA_DIR/storage}"

if ! mkdir -p "$DATA_DIR" "$STORAGE_DIR"; then
  echo "ERRO: nao consegui escrever em $DATA_DIR."
  echo "       Na Easypanel, monte um volume persistente em $DATA_DIR."
  exit 1
fi

echo "Banco de dados: $DATABASE_URL"
echo "Fotos:          $STORAGE_DIR"

cd "$APP_DIR"

if [ -z "${SESSION_SECRET:-}" ]; then
  echo "AVISO: SESSION_SECRET nao definido. O sistema vai usar um segredo de"
  echo "       desenvolvimento e qualquer um poderia forjar uma sessao."
  echo "       Defina SESSION_SECRET nas variaveis de ambiente antes de usar de verdade."
fi

echo "Conferindo as tabelas..."
"$TOOLS_DIR/node_modules/.bin/prisma" db push --skip-generate --schema "$APP_DIR/prisma/schema.prisma"

# A importacao reescreve nome, cargo, horario e turno de quem esta na planilha.
# Depois que o gestor comeca a mexer no cadastro, isso nao pode acontecer sozinho
# a cada deploy: por isso ela roda apenas quando ainda nao existe ninguem.
PESSOAS=$(node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.user
  .count()
  .then((total) => prisma.$disconnect().then(() => console.log(total)))
  .catch(() => console.log(0));
' 2>/dev/null || echo 0)

if [ "${IMPORTAR_BASE:-0}" = "1" ] || [ "$PESSOAS" = "0" ]; then
  echo "Colocando a base de colaboradores (pessoas cadastradas: $PESSOAS)..."
  cd "$APP_DIR"
  "$TOOLS_DIR/node_modules/.bin/tsx" "$APP_DIR/prisma/import-colaboradores.ts"
else
  echo "Base de colaboradores ja esta no banco ($PESSOAS pessoas). Nada a importar."
fi

echo "Ligando o sistema na porta ${PORT:-3000}..."
exec "$@"
