# Guilherme Avila — MazyOS

Sistema operacional da agência. Aqui ficam as regras de operação
do MazyOS — como o Claude lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

Esse arquivo é editável. As regras específicas da agência ficam no
final da página (perfil: agência).

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code

---

# A agência

## O que é esse workspace

Operação da agência Guilherme Avila. Aqui ficam a prospecção de
influenciadores, as parcerias ativas, os infoprodutos em produção e o
marketing da própria agência.

**Estrutura de pastas:**
- `_memoria/` — quem é a agência, como falamos, foco atual
- `identidade/` — marca da agência (em construção)
- `prospeccao/` — influenciadores em prospecção (primeiro contato, apresentação, qualificação)
- `clientes/` — uma subpasta por influenciador parceiro, autossuficiente
- `propostas/` — propostas de parceria em andamento
- `marketing/` — conteúdo institucional da agência
- `saidas/` — documentos pontuais, análises
- `dados/` — arquivos a analisar (métricas de perfil, relatórios de vendas, exports de ads)
- `tarefas.md` — pipeline da agência

Pastas que ainda não existem são criadas na primeira vez que forem usadas.

## Sobre a agência

Criamos e vendemos infoprodutos para influenciadores do Instagram, a
partir do conteúdo do próprio influenciador. Atendemos influenciadores
com 2 mil a 3 mil seguidores, nicho geral (a definir). O faturamento
das vendas é dividido 50/50 entre a agência e o influenciador.

Serviços principais:

- Criação do infoproduto (mentoria, curso, aulas gravadas, e-book etc.)
- Marketing do lançamento
- Tráfego pago

Time: 2 pessoas, os dois fazem tudo por enquanto. Guilherme faz o
fechamento comercial. Capacidade: a definir.

## Clientes ativos

Nenhum ainda. O `/atualizar` mantém essa lista sincronizada com as
pastas em `clientes/`.

## Funil comercial

1. Primeiro contato (Claude)
2. Apresentação (Claude)
3. Qualificação (Claude)
4. Lead qualificado → Guilherme fecha o serviço completo

## O que mais produzimos aqui

- Mensagens de prospecção e apresentação para influenciadores
- Propostas de parceria
- Estrutura e conteúdo de infoprodutos
- Campanhas de marketing e tráfego pago dos lançamentos

## Tom de voz

Descontraído e leve, mas profissional, com credibilidade e
posicionamento forte. Detalhes em `_memoria/preferencias.md`.

Evitar: traços de texto de IA, redundâncias, emojis, urgência falsa,
jargão de guru.

## Regras do sistema

- Influenciador novo em prospecção → `prospeccao/<nome-do-perfil>.md` com dados do perfil, etapa do funil e histórico de contato
- Lead qualificado → sinalizar pro Guilherme com um resumo do perfil e do motivo da qualificação
- Parceria fechada → criar pasta `clientes/<Nome>/` com briefing, estratégia do infoproduto e subpastas conforme as entregas
- Proposta nova → `propostas/<cliente>-<data>.html` antes de fechar
- Casos de sucesso ficam em `clientes/<Nome>/caso.md` (reuso em prospecção)

## Ferramentas conectadas

- [ ] Instagram / Meta Graph API
- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] Canva
- [ ] Meta Ads
- [ ] Google Ads

*(Marcar conforme for instalando os MCPs)*
