# Prospecção de influenciadores

Sistema que encontra influenciadores do nicho, organiza a primeira DM e
conversa sozinho com quem responde até passar o lead pro Guilherme.

## Como funciona

1. **Busca** (`npm run ig:buscar`): pesquisa perfis do nicho, abre cada um e
   aprova só quem tem entre 2 mil e 3 mil seguidores, posta com frequência,
   tem engajamento e fala do nicho. Os aprovados entram na fila com uma
   primeira mensagem já escrita. Custo: zero.
2. **Fila** (`npm run ig:fila`): página no navegador com os perfis do dia.
   Pra cada um: *Copiar e abrir DM*, cola no Instagram, envia, *Marcar como
   enviada*. Leva uns 20 segundos por perfil. Custo: zero.
3. **Conversa** (`npm run ig:conversar`): deixa a janela do Chrome aberta com o
   Instagram. Quando um influenciador da lista responde, o Claude (Haiku) lê a
   conversa inteira, escreve a próxima mensagem em cima do que ele disse e
   digita na DM. Apresenta o modelo, qualifica e, quando o lead está pronto
   (ou pede algo que só o Guilherme resolve), sai da conversa e cria um resumo
   em `prospeccao/qualificados/`. Usa o Claude Code já logado no computador,
   pelo plano do Claude. Sem chave de API. Cada resposta leva cerca de 1 minuto.

## Primeira vez

1. Instalar dependências: `npm install`
2. Fazer login no Instagram: `npm run ig:login` e entrar no @gui_de_avila na
   janela que abrir. O login fica salvo só nesse computador.
3. Testar o bot sem enviar nada: `npm run ig:teste`

O computador precisa ficar ligado, com o VS Code e o Claude Code logados,
enquanto o bot de conversa roda.

## Regras de segurança já configuradas

- Primeira DM é sempre enviada por uma pessoa (o Instagram não permite
  mandar mensagem automática pra quem nunca falou com a conta)
- Máximo de 15 primeiras DMs por dia e 40 respostas do bot por dia
- Pausas de 20 a 45 segundos entre perfis na busca
- Bot só responde entre 8h e 21h e só em conversas com leads da lista.
  Qualquer outra DM da conta é ignorada
- Se alguém da equipe responder à mão, o bot sai daquela conversa
- Se o Instagram der qualquer sinal de limite, tudo para na hora

## Ajustes

| O quê | Onde |
|---|---|
| Nicho, faixa de seguidores, termos de busca, limites, horários | `config.json` |
| Textos da primeira DM e do follow-up | `mensagens.json` |
| O que o bot fala, como qualifica, quando passa pro Guilherme | `roteiro.md` |

Perfil reprovado por engano? Apague a entrada dele em `leads.json` e rode
`npm run ig:buscar -- --perfis nome_do_perfil`.
