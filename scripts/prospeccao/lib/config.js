import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const PASTA = path.join(ROOT, 'prospeccao');
export const SESSAO_DIR = path.join(ROOT, '.instagram-session');
export const LEADS_FILE = process.env.PROSPECCAO_LEADS_FILE || path.join(PASTA, 'leads.json');
export const QUALIFICADOS_DIR = path.join(PASTA, 'qualificados');

export const config = lerJson('prospeccao/config.json');
export const mensagens = lerJson('prospeccao/mensagens.json');

export function lerTexto(relativo) {
  const arquivo = path.join(ROOT, relativo);
  return existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : '';
}

function lerJson(relativo) {
  return JSON.parse(lerTexto(relativo));
}
