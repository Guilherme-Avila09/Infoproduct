---
name: prospectar
description: Roda a prospecção de influenciadores no Instagram — busca perfis do nicho, monta a fila de primeiras DMs e liga o bot de conversa (Claude Haiku) que apresenta, qualifica e passa o lead pro Guilherme. Use quando o usuário disser "prospectar", "/prospectar", "acionar clientes", "buscar influenciadores", "abrir a fila", "ligar o bot de DM".
---

# /prospectar

Tudo roda por scripts em `scripts/prospeccao/`. O Claude Code só dispara os
comandos: não ler `prospeccao/leads.json` nem conversas, a não ser que o
usuário peça (economiza tokens).

## 1. Checar setup (só na primeira vez)

- `node_modules/` existe? Se não: `npm install`
- `.instagram-session/` tem login? Se o comando reclamar de login, pedir pro
  usuário rodar `npm run ig:login` no terminal dele e logar no @gui_de_avila
- O bot de conversa usa o Claude Code logado nessa máquina (plano do Claude,
  sem chave de API). Se ele reclamar de login, pedir pro usuário abrir o
  Claude no VS Code e logar

## 2. Rodar conforme o pedido

| Pedido | Comando | Como rodar |
|---|---|---|
| Buscar novos influenciadores | `npm run ig:buscar` | em background (leva ~15-20 min) |
| Conferir perfis específicos | `npm run ig:buscar -- --perfis user1,user2` | em background |
| Abrir a fila de envio | `npm run ig:fila` | em background, passar o link http://localhost:3737 |
| Ligar o bot de conversa | `npm run ig:conversar` | em background, fica rodando |
| Testar o bot sem enviar | `npm run ig:teste` | normal |

Sem argumento ("/prospectar"): rodar a busca e, quando terminar, abrir a fila.
Lembrar que o bot de conversa precisa estar ligado pra responder quem
retornar.

## 3. Avisar o usuário

- Não fechar a janela do Chrome que os scripts abrem
- Primeira DM é enviada pela equipe na fila (copiar, abrir DM, colar, enviar)
- Leads qualificados aparecem em `prospeccao/qualificados/<perfil>.md`
- Se aparecer "PAREI: Instagram sinalizou limite", não rodar nada por 24h

## Ajustes

- Nicho, faixa de seguidores, termos de busca, limites: `prospeccao/config.json`
- Modelos de primeira DM e follow-up: `prospeccao/mensagens.json`
- Roteiro e regras do bot: `prospeccao/roteiro.md`
