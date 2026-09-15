import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { LEADS_FILE } from './config.js';

// Todos os leads ficam num único arquivo, indexados pelo @ (minúsculo).
// Status: novo | pulado | enviado | follow_up | conversando | qualificado | humano | descartado | reprovado

export function carregarLeads() {
  if (!existsSync(LEADS_FILE)) return {};
  return JSON.parse(readFileSync(LEADS_FILE, 'utf8'));
}

// Relê o arquivo antes de gravar, porque a fila e o bot de conversa rodam ao mesmo tempo
export function atualizarLead(username, alterar) {
  const leads = carregarLeads();
  const atual = leads[username] ?? { username };
  leads[username] = { ...atual, ...alterar(atual), username };
  salvar(leads);
  return leads[username];
}

function salvar(leads) {
  mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  const temporario = `${LEADS_FILE}.tmp`;
  writeFileSync(temporario, JSON.stringify(leads, null, 2));
  for (let tentativa = 0; ; tentativa++) {
    try {
      renameSync(temporario, LEADS_FILE);
      return;
    } catch (erro) {
      // No Windows o rename falha se outro processo estiver lendo o arquivo naquele instante
      if (tentativa >= 5) throw erro;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
