import { normalizar } from './util.js';

const TITULOS = new Set([
  'dr', 'dra', 'prof', 'profa', 'personal', 'coach', 'nutri', 'treinador', 'treinadora',
  'fisio', 'mentor', 'mentora', 'sou', 'eu', 'o', 'a', 'oficial',
]);

// "𝐀𝐧𝐚 Souza | Personal" -> "Ana". Retorna "" quando não dá pra confiar no nome.
export function primeiroNome(nomeCompleto = '') {
  for (const parte of nomeCompleto.normalize('NFKC').split(/[\s|•·\-–—_.,/]+/)) {
    const limpo = parte.replace(/[^\p{L}]/gu, '');
    if (limpo.length < 2 || TITULOS.has(normalizar(limpo))) continue;
    return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
  }
  return '';
}

// Primeiro tema do config que aparece no texto (bio, categoria, legendas)
export function detectarTema(texto, temas) {
  const alvo = normalizar(texto);
  for (const [chave, rotulo] of Object.entries(temas)) {
    if (alvo.includes(normalizar(chave))) return rotulo;
  }
  return null;
}

export function preencher(modelo, { primeiro_nome, tema }) {
  let texto = modelo.replaceAll('{tema}', tema || 'o seu conteúdo');
  if (primeiro_nome) {
    texto = texto.replaceAll('{nome}', primeiro_nome);
  } else {
    texto = texto.replace(/,\s*\{nome\}/g, '').replace(/\{nome\},\s*/g, '').replaceAll('{nome}', '');
    texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  return texto.replace(/\s{2,}/g, ' ').trim();
}

// Mesmo lead sempre recebe o mesmo modelo de follow-up
export function modeloFixo(lista, username) {
  const soma = [...username].reduce((total, c) => total + c.charCodeAt(0), 0);
  return lista[soma % lista.length];
}
