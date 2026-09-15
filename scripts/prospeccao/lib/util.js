export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const entre = ([min, max]) => min + Math.random() * (max - min);

export const esperarSeg = (faixa) => sleep(entre(faixa) * 1000);

export const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Minúsculas, sem acento e com espaços simples: usado pra comparar textos
export const normalizar = (texto = '') =>
  texto.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const dataLocal = (d) => d.toLocaleDateString('sv-SE');

export const ehHoje = (iso) => Boolean(iso) && dataLocal(new Date(iso)) === dataLocal(new Date());

export const agora = () => new Date().toISOString();

export const log = (...partes) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...partes);
