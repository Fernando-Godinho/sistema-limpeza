# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js 16 (App Router, TypeScript) + Prisma com SQLite, escolhido pelo usuário entre as opções
apresentadas. Roda na própria máquina no primeiro momento e foi montado para trocar de banco (Postgres)
sem reescrever as telas. As fotos ficam no disco, guardadas fora da pasta pública e servidas por uma rota
autenticada. Sistema de idiomas próprio, tipado, com os textos em arquivos separados.

## Users

Três papéis, todos em português do Brasil cotidiano como idioma principal do sistema:

- **Líder de equipe.** É quem opera o aplicativo no dia a dia. Monta a equipe do dia, diz quem está
  presente, distribui as tarefas e executa cada serviço: confere o local, confere quem vai fazer, inicia,
  tira a foto do serviço pronto e conclui. Usa o aparelho em pé, no meio do movimento, muitas vezes com
  pressa. **Cada líder responde por um turno** — manhã, tarde ou noite — e só vê e só mexe na equipe
  daquele turno.
- **Colaborador(a) de limpeza.** Faz o serviço. Aparece no cadastro para dizer quem fez cada tarefa e é
  mostrado na tela para o líder conferir, mas **não entra no sistema** e não tem tela própria. Cada
  colaborador pertence ao turno de um líder: é o turno que define de quem ele é. O público é formado por
  trabalhadores de diferentes nacionalidades, pessoas idosas e pessoas com pouca escolaridade ou pouca
  experiência com celulares — por isso a interface que o líder usa precisa ser legível e simples mesmo
  quando quem está ao lado acompanhando tem pouca familiaridade com tecnologia.
- **Gestor(a).** Cadastra pessoas, locais e tarefas, e acompanha o resultado. Aceita mais telas e mais
  campos, desde que o fluxo diário do líder continue simples. Vê todos os turnos e é quem muda o turno
  de alguém quando a pessoa sai de uma equipe e entra em outra.

**Contexto de uso confirmado:** o aparelho fica no local de trabalho e quem opera é o líder.

## Product Purpose

Organizar o trabalho diário de uma equipe de limpeza e provar que o serviço foi feito.

O sistema existe para responder, em qualquer tela, a três perguntas: onde estou, o que preciso fazer
agora e qual botão devo apertar. Sucesso significa que o líder consegue, sem treinamento técnico, entrar
no sistema, achar a tarefa do dia, conferir o local e quem vai fazer, tirar e confirmar a foto do
serviço, iniciar e concluir, e entender que o registro foi salvo.

## Positioning

A interface é a prova de uso, não a tela. Cada registro de serviço carrega evidência que o próprio
operador consegue produzir e conferir: foto do antes, foto do depois e o horário real de início e de fim.
O sistema nunca confirma que algo foi salvo antes de o servidor responder, e nunca exige que o operador
escreva — ele escolhe em listas grandes.

## Operating Context

- O trabalho acontece em vários locais: escritório, clínica, escola, academia, restaurante, hotel.
- O dia começa com a conferência da equipe: quem veio, quem faltou e por quê.
- As tarefas são do tipo "limpeza de banheiros", "retirar o lixo", "higienizar bebedouros".
- O tipo de tarefa é apenas o nome do serviço: não existe configuração de foto.
- Uma foto por serviço: a foto do serviço pronto, tirada pelo líder. É sempre exigida — sem ela, o
  serviço não pode ser concluído, em nenhuma tarefa.
- A foto é tirada na hora, pela câmera. Não existe escolher da galeria.
- O aparelho fica com a tela exposta, no meio do movimento de pessoas; a conexão pode oscilar ou cair.
- A câmera do celular só é liberada pelo navegador em conexão segura, e a foto precisa ser tirada na hora.
- As mãos estão ocupadas e os olhos estão no ambiente, não na tela.

## Capabilities and Constraints

Confirmadas:

- Entrada por lista de nomes com foto/iniciais e PIN de 4 números. Só líder e gestor têm PIN: o
  colaborador não entra no sistema.
- Equipe de hoje: presente ou ausente, com motivo de ausência escolhido em lista e observação opcional.
- Distribuir tarefas em três escolhas guiadas: local, depois tarefa, depois pessoa.
- Fluxo guiado do líder em um só lugar: conferir o local, conferir quem vai fazer (podendo trocar a
  pessoa ali mesmo), iniciar, tirar a foto do serviço pronto e concluir. Uma ação principal por tela, e a
  conclusão só libera com a foto guardada.
- Foto tirada na hora pela câmera, com confirmação antes de guardar ("Usar foto" / "Tirar outra"),
  aviso "Enviando foto..." e "Foto salva" somente depois da resposta do servidor. A única exceção é a
  foto do rosto no cadastro do gestor, que pode vir de um arquivo.
- Aviso de problema com motivo escolhido em lista e campo de observação opcional.
- Painel do gestor com cadastro de pessoas, locais e tarefas, e dados de exemplo recriáveis. Com a base
  grande, a lista tem busca pelo nome e filtro por turno.
- Três idiomas prontos: português do Brasil (principal), espanhol e inglês, com seletor visível que
  mostra sempre o nome do idioma escrito.
- **Turnos e equipes.** Três turnos: manhã, tarde e noite, cada um com um líder. O colaborador entra no
  turno e o líder do turno passa a responder por ele; o gestor troca o turno no cadastro, se a pessoa
  mudar de equipe. A base real de colaboradores é importada de planilha e o turno é lido do horário de
  trabalho da pessoa.

Restrições e decisões:

- Textos da interface vivem só em arquivos de tradução; nenhum texto solto no código.
- Sessão de 12 horas, o turno de trabalho. Não existe desconexão automática por inatividade: ninguém é
  derrubado no meio de uma tarefa. O botão "Sair" fica sempre visível, para o líder encerrar quando
  entregar o aparelho.
- Não usar cor como único indicador de situação, nem ícone sem palavra.
- O cadastro aceita fotos do rosto para ajudar quem lê com dificuldade; quando não há foto, a tela
  mostra as iniciais em letra grande.
- **A equipe é do líder, não do aparelho.** O líder vê e altera apenas as pessoas e os serviços do turno
  dele; o gestor vê todos. A regra é conferida no servidor em cada ação, e não apenas escondida na tela.

Ainda em aberto (não inventar):

- Onde o sistema vai ficar hospedado quando sair da máquina local, e como as fotos serão guardadas lá.
- Nome oficial do produto e identidade visual da empresa, caso venham a existir.

## Brand Commitments

Nenhuma identidade de marca foi informada. O nome de trabalho é "Sistema de Limpeza".

Tom de voz confirmado pelo briefing: português brasileiro cotidiano, frases curtas, verbos diretos.
"Tirar foto" em vez de "anexar evidência fotográfica". "Equipe de hoje" em vez de "gestão diária de
efetivo". "Tente novamente" em vez de mensagem técnica. Nunca usar sigla, jargão administrativo ou
mensagem que culpe o usuário.

## Evidence on Hand

Não existe conteúdo real da empresa: nenhum nome de cliente, local, pessoa ou foto verdadeira foi
fornecido. Os dados que acompanham o sistema são de exemplo e estão marcados como tal, com PINs de
demonstração documentados no README. Nada aqui pode virar depoimento, número ou cliente real.

## Product Principles

1. **Uma ação principal por tela.** Se a tela pede duas coisas ao mesmo tempo, ela está errada.
2. **A facilidade de uso ganha da funcionalidade.** Em qualquer conflito entre acrescentar recurso e
   manter o uso simples, o recurso espera. O painel do gestor pode ser mais completo; o dia a dia não.
3. **Escolher em vez de escrever.** Lista grande, botão de seleção e opção pronta antes de campo livre.
4. **A prova vem antes do registro.** A conclusão de um serviço só existe quando existe a foto do
   serviço pronto, tirada na hora. Foto antiga, da galeria, não prova o trabalho de hoje.
5. **Nada se perde por engano.** Confirmar antes de cancelar, nunca apagar com um toque, nunca limpar o
   que a pessoa preencheu quando a conexão falhar.
6. **Falar como gente.** Palavra curta, verbo direto, e nenhuma mensagem que faça a pessoa se sentir
   culpada pelo erro.

## Accessibility & Inclusion

Requisito prioritário do produto, acima de refinamento visual. O que o sistema precisa cumprir:

- Letras grandes: corpo das instruções e ações entre 18 e 22 px; nada menor que isso para texto de uso.
- Botões com pelo menos 56 px de altura e áreas de toque de 48 × 48 px ou mais.
- Alto contraste entre texto e fundo, conferido numericamente.
- Ícone sempre acompanhado de palavra.
- Situação indicada por palavra e ícone, nunca só por cor.
- Botões principais sempre na mesma posição, previsíveis de tela em tela.
- Sem menu escondido, sem gesto difícil, sem exigir precisão de toque.
- Rótulos acessíveis para leitor de tela, avisos anunciados quando algo é salvo.
- Layout que não quebra ao ampliar o texto do navegador.
- Respeito a "reduzir movimento": nenhuma animação é necessária para entender uma ação.
- Uso em Android e iPhone, inclusive aparelhos mais antigos, e legível sob luz forte.

Teste obrigatório antes de considerar pronto: quem vai operar precisa conseguir, sem treinamento
técnico, entrar, achar a tarefa, identificar o local, tirar e confirmar a foto, iniciar e concluir um
serviço, entender que foi salvo e se recuperar de um erro simples.
