// Bot de conversa: olha a caixa de DMs e responde os influenciadores da lista usando o Claude (Haiku)
// pelo Claude Code logado nessa máquina.
//   npm run ig:conversar     fica rodando e checa a cada poucos minutos
//   npm run ig:teste         uma checagem só, mostra o que responderia sem enviar nada

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config, QUALIFICADOS_DIR } from './lib/config.js';
import {
  abrirNavegador, paginaInstagram, estaLogado, igApi, enviarMensagens, tsMs, textoDoItem,
  BloqueioInstagram, FalhaEnvio,
} from './lib/instagram.js';
import { carregarLeads, atualizarLead } from './lib/leads.js';
import { gerarResposta, FalhaClaude } from './lib/agente.js';
import { log, sleep, esperarSeg, ehHoje, normalizar, agora } from './lib/util.js';

const args = new Set(process.argv.slice(2));
const TESTE = args.has('--teste');
const UMA_VEZ = args.has('--uma-vez');
const C = config.conversa;

// Só mexe em conversas com leads nesses status. Qualquer outra DM da conta é ignorada.
const STATUS_ATIVOS = new Set(['novo', 'pulado', 'enviado', 'follow_up', 'conversando']);

const dentroDoHorario = () => {
  const hora = new Date().getHours();
  return hora >= C.horario_inicio && hora < C.horario_fim;
};

const respostasDeHoje = (leads) =>
  Object.values(leads).reduce((total, l) => total + (l.historico ?? []).filter((h) => ehHoje(h.em)).length, 0);

async function ciclo(pagina) {
  const leads = carregarLeads();
  let respondidas = respostasDeHoje(leads);

  const caixa = await igApi(pagina, '/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20&thread_message_limit=10');
  const viewerId = String(caixa.viewer?.pk ?? caixa.viewer?.pk_id ?? caixa.viewer?.id);

  for (const thread of caixa.inbox?.threads ?? []) {
    if (thread.users?.length !== 1) continue;
    const username = thread.users[0].username?.toLowerCase();
    let lead = leads[username];
    if (!lead || !STATUS_ATIVOS.has(lead.status)) continue;

    const itens = thread.items ?? [];
    const nossoPrimeiro = [...itens].reverse().find((i) => String(i.user_id) === viewerId);
    if (['novo', 'pulado'].includes(lead.status) && nossoPrimeiro && !TESTE) {
      // A equipe mandou a primeira DM mas não marcou na fila
      lead = atualizarLead(username, () => ({ status: 'enviado', enviado_em: new Date(tsMs(nossoPrimeiro.timestamp)).toISOString() }));
    }

    const ultimo = itens[0];
    if (!ultimo || String(ultimo.user_id) === viewerId) continue;
    if (Date.now() - tsMs(ultimo.timestamp) < C.esperar_resposta_do_influenciador_seg * 1000) continue;

    if (respondidas >= C.max_respostas_por_dia) {
      log(`Limite de ${C.max_respostas_por_dia} respostas por dia atingido. O resto fica pra amanhã.`);
      return;
    }

    await responder(pagina, thread.thread_id, lead, viewerId);
    respondidas++;
    await esperarSeg([20, 60]);
  }
}

async function responder(pagina, threadId, lead, viewerId) {
  const detalhe = await igApi(pagina, `/api/v1/direct_v2/threads/${threadId}/?limit=30`);
  const conversa = [...(detalhe.thread?.items ?? [])].reverse().map((i) => ({
    de: String(i.user_id) === viewerId ? 'nos' : 'influenciador',
    texto: textoDoItem(i),
    em: new Date(tsMs(i.timestamp)).toISOString(),
  }));

  // Se alguém da equipe escreveu à mão depois que o influenciador respondeu, o bot sai da conversa
  const textosDoBot = new Set((lead.historico ?? []).map((h) => normalizar(h.texto)));
  const primeiraResposta = conversa.findIndex((m) => m.de === 'influenciador');
  const escritoAMao = primeiraResposta >= 0 &&
    conversa.slice(primeiraResposta).some((m) => m.de === 'nos' && !textosDoBot.has(normalizar(m.texto)));
  if (escritoAMao) {
    log(`@${lead.username}: a equipe já respondeu manualmente. Bot fora dessa conversa.`);
    if (!TESTE) atualizarLead(lead.username, () => ({ status: 'humano', motivo: 'equipe assumiu manualmente' }));
    return;
  }

  if ((lead.bot_msgs ?? 0) >= C.max_mensagens_do_bot_por_conversa) {
    log(`@${lead.username}: limite de mensagens do bot atingido. Passando pro Guilherme.`);
    if (!TESTE) finalizar(lead, threadId, conversa, { etapa: 'humano', motivo: 'conversa longa, limite do bot atingido', resumo: lead.resumo ?? '' });
    return;
  }

  log(`@${lead.username} respondeu: "${conversa.at(-1).texto.slice(0, 80)}"`);
  const r = await gerarResposta({ lead, conversa });

  if (TESTE) {
    console.log(`\n--- TESTE @${lead.username} (nada foi enviado) ---`);
    console.log(`Etapa: ${r.etapa} | Motivo: ${r.motivo}`);
    r.mensagens.forEach((m) => console.log(`> ${m}`));
    console.log('---\n');
    return;
  }

  if (r.mensagens.length) {
    await enviarMensagens(pagina, threadId, r.mensagens);
    await confirmarEnvio(pagina, threadId, viewerId, r.mensagens.at(-1));
    log(`@${lead.username}: enviei ${r.mensagens.length} mensagem(ns). Etapa: ${r.etapa}`);
  }

  const atualizado = atualizarLead(lead.username, (atual) => ({
    status: ['qualificado', 'humano', 'descartado'].includes(r.etapa) ? r.etapa : 'conversando',
    etapa: r.etapa,
    qualificacao: r.qualificacao,
    resumo: r.resumo,
    motivo: r.motivo,
    bot_msgs: (atual.bot_msgs ?? 0) + r.mensagens.length,
    historico: [...(atual.historico ?? []), ...r.mensagens.map((texto) => ({ texto, em: agora() }))],
  }));

  if (['qualificado', 'humano'].includes(r.etapa)) {
    finalizar(atualizado, threadId, [...conversa, ...r.mensagens.map((texto) => ({ de: 'nos', texto, em: agora() }))], r);
  }
}

async function confirmarEnvio(pagina, threadId, viewerId, ultimoTexto) {
  await sleep(4000);
  const detalhe = await igApi(pagina, `/api/v1/direct_v2/threads/${threadId}/?limit=5`);
  const enviados = (detalhe.thread?.items ?? []).filter((i) => String(i.user_id) === viewerId).map((i) => normalizar(textoDoItem(i)));
  if (!enviados.includes(normalizar(ultimoTexto))) {
    throw new FalhaEnvio('Digitei a mensagem mas ela não apareceu na conversa.');
  }
}

// Gera o resumo pro Guilherme em prospeccao/qualificados/
function finalizar(lead, threadId, conversa, r) {
  if (r.etapa !== lead.status) atualizarLead(lead.username, () => ({ status: r.etapa, motivo: r.motivo }));
  mkdirSync(QUALIFICADOS_DIR, { recursive: true });
  const q = r.qualificacao ?? lead.qualificacao ?? {};
  const titulo = r.etapa === 'qualificado' ? 'Lead qualificado' : 'Precisa do Guilherme';
  const conteudo = [
    `# ${titulo}: @${lead.username}`,
    '',
    `- **Perfil:** https://www.instagram.com/${lead.username}/`,
    `- **Conversa:** https://www.instagram.com/direct/t/${threadId}/`,
    `- **Seguidores:** ${lead.seguidores ?? '?'} · **Tema:** ${lead.tema ?? '?'}`,
    `- **Motivo:** ${r.motivo}`,
    '',
    '## Resumo',
    '',
    r.resumo || '(sem resumo)',
    '',
    '## Qualificação',
    '',
    '| Critério | Resposta |',
    '|---|---|',
    ...Object.entries(q).map(([k, v]) => `| ${k.replaceAll('_', ' ')} | ${v} |`),
    '',
    '## Conversa',
    '',
    ...conversa.map((m) => `**${m.de === 'nos' ? 'Nós' : 'Influenciador'}** (${new Date(m.em).toLocaleString('pt-BR')}): ${m.texto}\n`),
  ].join('\n');
  writeFileSync(path.join(QUALIFICADOS_DIR, `${lead.username}.md`), conteudo);
  log(`\x07>>> ${titulo.toUpperCase()}: @${lead.username}. Resumo em prospeccao/qualificados/${lead.username}.md`);
}

const contexto = await abrirNavegador();
try {
  const pagina = await paginaInstagram(contexto);
  if (!(await estaLogado(pagina))) throw new Error('O navegador não está logado no Instagram. Rode "npm run ig:login" primeiro.');
  log(TESTE ? 'Modo teste: nada será enviado.' : 'Bot de conversa rodando. Ctrl+C pra parar.');

  while (true) {
    if (dentroDoHorario() || TESTE) {
      try {
        await ciclo(pagina);
      } catch (erro) {
        const fatal = erro instanceof BloqueioInstagram || erro instanceof FalhaEnvio ||
          (erro instanceof FalhaClaude && erro.fatal) || /ig:login/.test(erro.message);
        if (fatal || UMA_VEZ) throw erro;
        // Falha passageira (internet, API ocupada): tenta de novo na próxima checagem
        log(`Erro nessa checagem, tento de novo depois: ${erro.message}`);
      }
    } else {
      log(`Fora do horário (${C.horario_inicio}h às ${C.horario_fim}h). Aguardando.`);
    }
    if (UMA_VEZ) break;
    await esperarSeg(C.intervalo_checagem_min.map((m) => m * 60));
  }
} catch (erro) {
  if (erro instanceof BloqueioInstagram) {
    console.error(`\nPAREI: ${erro.message}\nDeixe a conta descansar pelo menos 24 horas antes de rodar de novo.`);
    process.exitCode = 2;
  } else if (erro instanceof FalhaEnvio) {
    console.error(`\nPAREI: ${erro.message}\nConfira a conversa no Instagram antes de rodar de novo, pra não duplicar mensagem.`);
    process.exitCode = 3;
  } else if (erro instanceof FalhaClaude && erro.fatal) {
    console.error(`\nPAREI: ${erro.message}\nConfira se o Claude Code está logado (abra o Claude no VS Code).`);
    process.exitCode = 1;
  } else {
    console.error(`\nErro: ${erro.message}`);
    process.exitCode = 1;
  }
} finally {
  await contexto.close();
}
