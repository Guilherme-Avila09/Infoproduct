// Página local com a fila do dia: copiar a mensagem, abrir a DM, marcar como enviada.
//   npm run ig:fila

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { config, mensagens } from './lib/config.js';
import { carregarLeads, atualizarLead } from './lib/leads.js';
import { preencher, modeloFixo } from './lib/mensagens.js';
import { ehHoje, agora, log } from './lib/util.js';

const PORTA = Number(process.env.PORTA_FILA) || 3737;
const HTML = readFileSync(new URL('./fila.html', import.meta.url), 'utf8');

function dadosDaFila() {
  const leads = Object.values(carregarLeads());
  const limite = config.envio.limite_primeiras_dms_por_dia;
  const enviadasHoje = leads.filter((l) => ehHoje(l.enviado_em)).length;
  const prazoFollowUp = config.envio.dias_para_follow_up * 86400000;

  const novos = leads
    .filter((l) => l.status === 'novo')
    .sort((a, b) => (a.encontrado_em ?? '').localeCompare(b.encontrado_em ?? ''))
    .slice(0, Math.max(0, limite - enviadasHoje));

  const followUps = leads
    .filter((l) => l.status === 'enviado' && Date.now() - Date.parse(l.enviado_em) > prazoFollowUp)
    .map((l) => ({ ...l, mensagem_follow_up: preencher(modeloFixo(mensagens.follow_up, l.username), l) }));

  const resumo = {};
  for (const l of leads) resumo[l.status] = (resumo[l.status] ?? 0) + 1;

  return { limite, enviadasHoje, novos, followUps, resumo };
}

const ACOES = {
  enviado: { de: ['novo'], alterar: (m) => ({ status: 'enviado', enviado_em: agora(), ...(m && { mensagem_inicial: m }) }) },
  pular: { de: ['novo'], alterar: () => ({ status: 'pulado' }) },
  follow_up: { de: ['enviado'], alterar: (m) => ({ status: 'follow_up', follow_up_em: agora(), ...(m && { mensagem_follow_up: m }) }) },
  descartar: { de: ['enviado', 'novo'], alterar: () => ({ status: 'descartado', motivo: 'descartado na fila' }) },
};

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (parte) => (corpo += parte));
    req.on('end', () => {
      try {
        resolve(JSON.parse(corpo || '{}'));
      } catch (erro) {
        reject(erro);
      }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  const responderJson = (status, dados) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dados));
  };

  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(HTML);
    }
    if (req.method === 'GET' && req.url === '/api/fila') return responderJson(200, dadosDaFila());

    if (req.method === 'POST' && req.url === '/api/acao') {
      const { username, acao, mensagem } = await lerCorpo(req);
      const regra = ACOES[acao];
      const lead = carregarLeads()[username];
      if (!regra || !lead) return responderJson(400, { erro: 'Ação ou lead inválido' });
      if (!regra.de.includes(lead.status)) return responderJson(409, { erro: `Lead já está como "${lead.status}"` });
      atualizarLead(username, () => regra.alterar(mensagem?.trim()));
      return responderJson(200, dadosDaFila());
    }

    responderJson(404, { erro: 'Não encontrado' });
  } catch (erro) {
    responderJson(500, { erro: erro.message });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  const url = `http://localhost:${PORTA}`;
  log(`Fila aberta em ${url}  (Ctrl+C pra fechar)`);
  const abrir = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  if (!process.env.NAO_ABRIR_NAVEGADOR) exec(abrir);
});
