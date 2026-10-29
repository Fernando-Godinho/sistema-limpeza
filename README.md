# Sistema de Limpeza

Sistema para organizar o trabalho diário de uma equipe de limpeza e registrar, com foto e horário,
que cada serviço foi feito.

Foi construído com **acessibilidade como requisito principal**, não como acabamento: letras grandes,
botões grandes, alto contraste, ícone sempre acompanhado de palavra e uma ação principal por tela.
As decisões de projeto estão registradas em [PRODUCT.md](./PRODUCT.md).

---

## O que dá para fazer

**Líder e gestor**

- `Equipe de hoje` — marcar quem veio e quem faltou, com o motivo escolhido em lista.
- `Distribuir tarefas` — escolher o local, depois a tarefa, depois a pessoa, e conferir antes de salvar.
- `Ver serviços` — o que não começou, o que está em andamento e o que já foi concluído, por dia.
- Detalhe do serviço — foto do início e do fim, horários reais, histórico do que aconteceu,
  trocar a pessoa e cancelar (com desfazer).

**Cada líder responde por um turno.** Manhã, tarde e noite: o líder vê e mexe só na equipe do turno
dele; o gestor vê todo mundo. A regra vale nas telas e é conferida de novo no servidor, em cada ação.

**Colaborador**

- `Minhas tarefas de hoje` — só o que é dele, em cartões grandes.
- Início guiado: conferir o local → conferir quem faz → tirar a foto (quando a tarefa pede) → iniciar serviço.
- Enquanto o serviço está em andamento, a tela mostra os dois botões de foto — **Tirar foto do início** e
  **Tirar foto do fim** — e o botão **Concluir serviço**, que só libera depois que a foto do fim estiver
  guardada. A tela diz o que falta, em vez de deixar um botão apagado sem explicação.
- `Avisar um problema` — motivo em lista e explicação opcional.

**Gestor**

- Cadastro de pessoas, locais e tarefas. Cada tarefa decide apenas se pede a **foto do início**: a foto do
  fim é sempre exigida para concluir qualquer serviço.
- Resumo do dia, idioma principal do sistema e recomeço dos dados de exemplo.

---

## Como rodar

Precisa do **Node.js 20 ou mais novo**.

```bash
npm install
cp .env.example .env   # depois troque o SESSION_SECRET
npm run db:push     # cria o banco SQLite
npm run db:seed     # cria os dados de exemplo
npm run dev         # abre em http://localhost:3000
```

**Atenção ao testar no celular pela rede local.** A foto do serviço é tirada na hora, pela câmera, e
não pode vir da galeria — é ela que prova como o lugar estava e como ficou. O navegador do celular só
libera a câmera em conexão segura. Então:

- em `http://localhost:3000` (no próprio computador), a câmera funciona e dá para testar tudo;
- aberto pelo celular em `http://SEU-IP:3000`, a câmera **não** é liberada pelo navegador e o sistema
  explica isso na tela. Para usar de verdade no celular, publique com `https`.

Enquanto não houver `https`, o teste no celular serve para conferir botões, textos e tamanhos, mas o
registro das fotos precisa ser feito no computador.

Para produção:

```bash
npm run build
npm start
```

Antes de usar de verdade, **troque todos os PINs** (os de exemplo estão logo abaixo) e mude o
`SESSION_SECRET` no arquivo `.env`.

### PINs dos dados de exemplo

| Pessoa | Papel | PIN |
|---|---|---|---|
| Carla Nogueira | Gestora | `1000` |
| Marcos Oliveira | Líder | `2000` |
| Sandra Ribeiro | Líder | `2001` |

Os colaboradores (Maria, Rosa, João, Ana, Francisca, Carlos, Antônia e Yusuf) estão no cadastro para
dizer quem fez cada serviço, mas não têm PIN: eles não entram no sistema.

Na tela de entrada, toque no seu nome e digite os quatro números. Ao completar o quarto número, o
sistema entra sozinho — não existe botão de "entrar" para procurar.

Dá para recomeçar com os dados de exemplo a qualquer momento em **Painel do gestor → Ajustes**.

### Base de colaboradores da empresa

A lista real de colaboradores fica em [prisma/data/colaboradores.json](./prisma/data/colaboradores.json),
gerada a partir da planilha de pessoal. Ela guarda nome, matrícula, função, horário de trabalho e turno
de cada pessoa — nada de CPF, salário ou dado bancário.

```bash
npm run db:import                # atualiza a lista de pessoas (não apaga nada)
npm run db:import -- --reset     # apaga serviços, presenças e fotos, e recomeça limpo
```

O que o import faz:

- **Turno pelo horário.** Quem começa entre 5h e 9h59 é da manhã; entre 10h e 17h59, da tarde; o resto
  (18h em diante ou de madrugada) é da noite.
- **Líder pelo turno.** Cada colaborador fica ligado ao líder daquele turno. Para trocar a equipe de
  alguém, o gestor muda o turno da pessoa em **Painel do gestor → Colaboradores**; o líder é ajustado
  sozinho.
- **Só quem executa limpeza entra como colaborador.** Funções administrativas ficam de fora.
- **Quem entra no sistema** é o gestor e os três líderes. Na primeira execução o import sorteia um PIN
  para cada um e mostra no terminal — anote e troque depois no painel.
- **Rodar de novo não duplica ninguém:** a pessoa é encontrada pela matrícula junto com o nome. A
  planilha repete duas matrículas para pessoas diferentes, e por isso o nome também faz parte da chave.

Locais e tarefas não são tocados pelo import: eles continuam sendo cadastrados e ajustados no painel.

### Docker

A imagem compila o Next em modo standalone e roda sem npm: o container só inicia o servidor. O banco
SQLite e as fotos ficam em `/app/data`, que precisa ser um volume.

```bash
docker build -t sistema-limpeza .
docker run -d --name limpeza -p 3000:3000 \
  -v limpeza-dados:/app/data \
  -e SESSION_SECRET="uma-frase-longa-e-aleatoria" \
  sistema-limpeza
```

Na primeira subida o container:

1. cria as tabelas que faltarem (`prisma db push`);
2. coloca a base de colaboradores para dentro, **somente se ainda não houver ninguém cadastrado**, e
   mostra no log os PINs sorteados do gestor e dos três líderes — anote e troque no painel;
3. liga o servidor na porta 3000.

Nas subidas seguintes nada é importado de novo, então o que o gestor mudou no cadastro não é
sobrescrito. Para forçar a importação outra vez (quando a planilha for atualizada), suba com
`IMPORTAR_BASE=1`; os PINs existentes são mantidos.

| Variável | Para que serve | Padrão |
|---|---|---|
| `SESSION_SECRET` | Assina o cookie de sessão. **Obrigatória.** | — |
| `DATABASE_URL` | Caminho do banco SQLite | `file:/app/data/limpeza.db` |
| `STORAGE_DIR` | Pasta das fotos | `/app/data/storage` |
| `IMPORTAR_BASE` | `1` reimporta a base de colaboradores | `0` |
| `TZ` | Fuso usado para o "dia de hoje" | `America/Sao_Paulo` |
| `PORT` | Porta do servidor | `3000` |

Se o volume for uma pasta do próprio servidor (bind mount) em vez de um volume nomeado, ela precisa
pertencer ao usuário `1000:1000` — é esse o usuário com que o sistema roda.

### Easypanel

1. Suba o projeto no GitHub.
2. Em **Create → App**, escolha o repositório.
3. Em **Build**, selecione **Dockerfile** (o arquivo está na raiz do projeto).
4. Em **Domains**, aponte o domínio para a porta **3000** e ligue o HTTPS — sem HTTPS o navegador do
   celular não libera a câmera, e sem câmera não dá para concluir serviço. O acesso também precisa ser
   por HTTPS para a pessoa continuar conectada: em produção o cookie de sessão só é aceito em conexão
   segura.
5. Em **Mounts**, crie um volume e monte em **`/app/data`**. Sem esse volume, cada deploy começa com
   banco vazio e as fotos somem.
6. Em **Environment**, defina `SESSION_SECRET` (uma frase longa e aleatória). As outras variáveis são
   opcionais.
7. Faça o deploy e veja o log: os PINs iniciais aparecem ali na primeira subida.

Cada deploy novo mantém o volume, ou seja, pessoas, presenças, serviços e fotos continuam de pé.

---

## Idiomas

Textos prontos em **português do Brasil** (principal), **espanhol** e **inglês**.

Todos os textos ficam em [src/i18n/messages](./src/i18n/messages). Nenhuma frase da interface está
escrita dentro de um componente.

**Para acrescentar um idioma:**

1. copie `src/i18n/messages/pt-BR.ts` para um arquivo novo e traduza os valores (o TypeScript vai
   avisar se faltar alguma chave);
2. registre o idioma em [src/i18n/messages/index.ts](./src/i18n/messages/index.ts);
3. acrescente o idioma em `LOCALES` e `LOCALE_INFO` em [src/i18n/config.ts](./src/i18n/config.ts).

O seletor de idioma fica sempre no alto da tela e mostra o nome do idioma escrito no próprio idioma
("Português", "Español", "English"). **Não usamos bandeira**: idioma não é nacionalidade. Cada pessoa
guarda o seu idioma preferido, que volta a valer quando ela entra de novo.

Nomes de pessoas, locais e tarefas **não** são traduzidos: eles ficam como o gestor cadastrou.

---

## Como o sistema está organizado

```
prisma/
  schema.prisma        modelo de dados (SQLite)
  seed.ts              cria os dados de exemplo
  import-colaboradores.ts  coloca a base de colaboradores no banco
  data/colaboradores.json  a base: nome, matrícula, função, horário e turno

src/
  app/
    entrar/            tela de entrada (nome + PIN)
    (painel)/          telas de dentro do sistema
      lider/           equipe, distribuir tarefas, ver serviços
      servicos/[id]/   a tela do serviço: o fluxo guiado e o registro
      admin/           painel do gestor
    api/photos/        recebe e entrega as fotos
  components/          peças visuais reaproveitadas
  i18n/                textos e troca de idioma
  lib/
    actions/           ações do servidor (o que muda dados)
    domain.ts          valores válidos (papéis, turnos, situações, motivos)
    photos.ts          guarda a foto no disco e registra no banco
    session.ts         sessão e permissões
    team.ts            quem é da equipe de cada líder (turno)
    storage.ts         pasta das fotos
```

**Uma foto por serviço, tirada na hora.** O líder tira a foto do serviço pronto, pela câmera, e confere
antes de usar. Não existe "escolher da galeria": foto antiga não prova o trabalho de hoje. A única
exceção é a foto do rosto no cadastro do gestor, que pode ser escolhida de um arquivo — ela é um dado
de cadastro, não a prova de um serviço, e costuma ser feita em um computador sem câmera.

**Onde as fotos ficam.** Em `./storage/photos`, fora de `public`. Elas são entregues por
`/api/photos/[id]`, que exige alguém conectado — assim, o endereço da imagem, sozinho, não abre nada
para quem está de fora. O sistema também nunca diz "Foto salva" antes de o servidor confirmar.

**Segurança aplicada.** PIN guardado como hash `scrypt` (nunca em texto puro); cookie de sessão
assinado, `httpOnly`; cinco tentativas erradas de PIN bloqueiam a pessoa por um minuto; o sistema
recusa apagar pessoa, local ou tarefa que já apareça em algum serviço (ele oferece desativar, para o
histórico continuar de pé). Colaborador não tem PIN nem sessão: mesmo que alguém digite números para
um colaborador, o sistema ignora e não deixa entrar. O líder só alcança a própria equipe — marcar
presença, distribuir tarefa, trocar a pessoa, anexar foto e mudar a situação de um serviço passam
todos pelo filtro do turno no servidor, e não apenas pela tela.

---

## Decisões de acessibilidade (e por quê)

| Decisão | Motivo |
|---|---|
| Texto de uso entre 18 e 22 px; nada abaixo de 18 px | Leitura confortável para pessoas idosas e para quem lê devagar |
| Botões de ação com 56 px (as listas, 48 px) e cartões de 134 px | Toque sem precisão, mesmo com o celular em uma mão só |
| Contraste conferido numericamente; todas as combinações passam de 4,5:1 | Legível sob luz forte e para quem tem baixa visão |
| Ícone sempre acompanhado de palavra; situação com desenho + texto | Quem não lê bem não depende do desenho; quem não distingue cor não depende da cor |
| `Passo 2 de 4` escrito por extenso | Só os pontinhos não dizem nada a quem nunca usou um aplicativo |
| Presente à esquerda e Ausente à direita, sempre | A posição se aprende uma vez e não muda mais |
| Nome de cada idioma no próprio idioma, sem bandeira | Reconhecer o seu idioma sem saber outro; idioma não é nacionalidade |
| Avisos anunciados em voz alta (`aria-live`) ao salvar | Quem usa leitor de tela recebe a confirmação em palavras |
| Anel de foco em duas camadas (branco + azul) | O foco continua visível sobre botão escuro e sobre fundo claro |
| Nada depende de animação; respeita "reduzir movimento" | O sistema funciona igual para quem desliga animações |
| Tudo em `rem` | Aumentar a letra no navegador não quebra o layout |
| Nada é apagado com um toque; cancelar tem desfazer | Errar o toque não custa o registro de um serviço |
| A foto do serviço só pela câmera, na hora | Foto antiga da galeria não prova o serviço de hoje |
| A foto do serviço pronto é sempre exigida, e o servidor recusa a conclusão sem ela | O registro só existe quando existe a prova de que o trabalho ficou pronto |
| O líder confere o local e a pessoa antes de iniciar | Quem opera erra menos quando o sistema repete o que foi combinado |
| Quando a conexão cai, nada do que foi preenchido se perde | Perder o trabalho no meio da tarefa é inaceitável |

Os trechos de código que cuidam disso estão comentados em
[src/app/globals.css](./src/app/globals.css) e em [src/components](./src/components).

---

## Trocar SQLite por PostgreSQL

1. Em `prisma/schema.prisma`, troque o `provider` de `"sqlite"` para `"postgresql"`.
2. No `.env`, aponte `DATABASE_URL` para o seu banco.
3. Rode `npx prisma migrate dev` para criar as tabelas.
4. `npm run db:seed` se quiser os dados de exemplo.

O resto do código não muda: nenhuma tela fala com o banco diretamente.

**Ao publicar em produção, revise também:**

- a trava de tentativas de PIN vive na memória do servidor; com **mais de uma instância**, ela precisa
  virar um registro no banco (está comentado em `src/lib/actions/auth.ts`);
- as fotos ficam no disco da máquina. Se o serviço rodar em vários servidores, troque
  `src/lib/photos.ts` por um armazenamento compartilhado (S3, Azure Blob, etc.);
- use `https`, que também é o que libera a câmera direta no celular;
- faça cópia de segurança da pasta `storage` junto com o banco.

---

## O que ainda não foi feito

- **Teste com pessoas de verdade.** O briefing exige testar os fluxos com quem tem pouca
  familiaridade com aplicativos antes de considerar a interface pronta. Isso não é trabalho de
  programação e ainda **não foi feito**. O sistema está pronto para esse teste, não aprovado por ele.
- **Instalação como aplicativo (PWA).** Não há manifesto nem service worker; para funcionar sem
  internet nos locais, seria o próximo passo.
- **Publicação com `https`.** Como a foto do serviço só pode vir da câmera, o sistema precisa de
  `https` para ser usado no celular. Sem isso, o registro das fotos fica limitado ao computador.
- **Relatórios.** O gestor vê o dia; ainda não existem relatórios por período ou por pessoa.
- **Recuperação de PIN.** Hoje quem esquece os números precisa pedir ao gestor para cadastrar outro.
- **Desfazer a conclusão.** Se o líder concluir um serviço por engano, hoje ele cancela o serviço (que
  fica registrado como cancelado). Voltar para "em andamento" ainda não existe.
