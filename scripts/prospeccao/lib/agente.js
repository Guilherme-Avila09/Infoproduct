// Gera a resposta do bot usando o Claude Code já logado nessa máquina (plano do Claude, sem chave de API).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { config, lerTexto } from './config.js';

// fatal = não adianta tentar de novo sem alguém mexer (login, Claude Code ausente)
export class FalhaClaude extends Error {
  constructor(mensagem, { fatal = false } = {}) {
    super(mensagem);
    this.fatal = fatal;
  }
}

const Sim = z.enum(['sim', 'nao', 'desconhecido']);

const Resposta = z.object({
  mensagens: z.array(z.string()).describe('Mensagens a enviar agora, em ordem. Vazio se não precisar responder.'),
  etapa: z.enum(['apresentacao', 'qualificacao', 'qualificado', 'humano', 'descartado']),
  qualificacao: z.object({
    ensina_algo_claro: Sim,
    ja_vendeu_online: Sim,
    disponivel_para_criar: Sim,
    topa_divulgar: Sim,
    aceita_50_50: Sim,
  }),
  resumo: z.string().describe('Resumo curto do lead pro Guilherme: o que ensina, interesse, objeções.'),
  motivo: z.string().describe('Por que escolheu essa etapa.'),
});

const { $schema, ...schema } = z.toJSONSchema(Resposta);

const system = [
  lerTexto('prospeccao/roteiro.md'),
  '# Preferências de escrita da agência\n\n' + lerTexto('_memoria/preferencias.md'),
  'Responda somente com os campos pedidos no formato estruturado.',
].join('\n\n');

// Procura o Claude Code: variável CLAUDE_BIN, extensão do VS Code (versão mais nova) ou "claude" no PATH
function acharClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const executavel = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const extensoes = path.join(os.homedir(), '.vscode', 'extensions');
  if (existsSync(extensoes)) {
    const versoes = readdirSync(extensoes)
      .filter((nome) => nome.startsWith('anthropic.claude-code-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const versao of versoes) {
      const caminho = path.join(extensoes, versao, 'resources', 'native-binary', executavel);
      if (existsSync(caminho)) return caminho;
    }
  }
  return 'claude';
}

function rodarClaude(prompt) {
  const args = [
    '-p',
    '--safe-mode',
    '--tools', '',
    '--model', config.conversa.modelo,
    '--no-session-persistence',
    '--output-format', 'json',
    '--system-prompt', system,
    '--json-schema', JSON.stringify(schema),
  ];

  return new Promise((resolve, reject) => {
    const processo = spawn(acharClaude(), args, { cwd: os.tmpdir(), windowsHide: true });
    let saida = '';
    let erros = '';
    const limite = setTimeout(() => processo.kill(), 180000);

    processo.stdout.on('data', (parte) => (saida += parte));
    processo.stderr.on('data', (parte) => (erros += parte));
    processo.on('error', (erro) => {
      clearTimeout(limite);
      reject(new FalhaClaude(`Não encontrei o Claude Code (${erro.message}). Abra o VS Code com a extensão do Claude instalada.`, { fatal: true }));
    });
    processo.on('close', () => {
      clearTimeout(limite);
      let json;
      try {
        json = JSON.parse(saida);
      } catch {
        return reject(new FalhaClaude(`Claude Code não respondeu (${(erros || saida).trim().slice(0, 200) || 'tempo esgotado'})`));
      }
      if (json.is_error || !json.structured_output) {
        const detalhe = String(json.result ?? json.subtype ?? 'sem detalhes');
        const fatal = /log ?in|auth|credential/i.test(detalhe);
        return reject(new FalhaClaude(`Claude Code: ${detalhe.slice(0, 200)}`, { fatal }));
      }
      resolve(json.structured_output);
    });

    processo.stdin.end(prompt);
  });
}

export async function gerarResposta({ lead, conversa }) {
  const saida = await rodarClaude(montarContexto(lead, conversa));
  const validada = Resposta.safeParse(saida);
  if (!validada.success) throw new FalhaClaude('Resposta do Claude veio fora do formato esperado.');
  // Parágrafo separado vira DM separada, como uma pessoa mandaria
  const mensagens = validada.data.mensagens.flatMap((m) => m.split(/\n\s*\n/)).map((m) => m.trim()).filter(Boolean);
  return { ...validada.data, mensagens };
}

function montarContexto(lead, conversa) {
  const perfil = [
    `@${lead.username}${lead.nome ? ` (${lead.nome})` : ''}`,
    lead.seguidores ? `${lead.seguidores} seguidores` : null,
    lead.tema ? `tema: ${lead.tema}` : null,
    lead.bio ? `bio: ${lead.bio}` : null,
    ...(lead.legendas ?? []).map((l) => `legenda recente: ${l}`),
  ].filter(Boolean);

  const linhas = conversa.map((m) => {
    const quem = m.de === 'nos' ? 'Nós' : 'Influenciador';
    return `[${new Date(m.em).toLocaleString('pt-BR')}] ${quem}: ${m.texto}`;
  });

  return [
    '<perfil_do_influenciador>',
    ...perfil,
    '</perfil_do_influenciador>',
    '',
    '<conversa>',
    '"Nós" é o perfil @gui_de_avila. A primeira mensagem nossa foi enviada pela equipe.',
    ...linhas,
    '</conversa>',
    '',
    `Mensagens que você já enviou nessa conversa: ${lead.bot_msgs ?? 0} de no máximo ${config.conversa.max_mensagens_do_bot_por_conversa}.`,
    `Etapa atual registrada: ${lead.etapa ?? 'nenhuma (primeira resposta dele)'}.`,
    'Escreva a próxima resposta seguindo o roteiro.',
  ].join('\n');
}
