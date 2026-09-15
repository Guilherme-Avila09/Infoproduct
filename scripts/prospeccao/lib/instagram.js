import { chromium } from 'playwright';
import { SESSAO_DIR } from './config.js';
import { sleep } from './util.js';

// Qualquer sinal de limite do Instagram para tudo na hora. Não tentar de novo.
export class BloqueioInstagram extends Error {}
export class FalhaEnvio extends Error {}

const IG_APP_ID = '936619743392459';

// Perfil de navegador separado, só pro @ da agência. O login fica salvo em .instagram-session/
export async function abrirNavegador() {
  const opcoes = { headless: false, viewport: { width: 1280, height: 860 }, locale: 'pt-BR' };
  try {
    return await chromium.launchPersistentContext(SESSAO_DIR, { ...opcoes, channel: 'chrome' });
  } catch {
    return await chromium.launchPersistentContext(SESSAO_DIR, opcoes);
  }
}

export async function paginaInstagram(contexto) {
  const pagina = contexto.pages()[0] ?? (await contexto.newPage());
  await pagina.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await fecharPopups(pagina);
  return pagina;
}

export async function estaLogado(pagina) {
  const cookies = await pagina.context().cookies('https://www.instagram.com');
  return cookies.some((c) => c.name === 'sessionid' && c.value);
}

// Chama os mesmos endereços que o site do Instagram usa, de dentro da página logada
export async function igApi(pagina, caminho) {
  const { status, texto } = await pagina.evaluate(
    async ({ caminho, appId }) => {
      const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
      const r = await fetch(caminho, {
        credentials: 'include',
        headers: { 'X-IG-App-ID': appId, 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': csrf },
      });
      return { status: r.status, texto: await r.text() };
    },
    { caminho, appId: IG_APP_ID },
  );

  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // resposta em HTML costuma ser a tela de login
  }

  const mensagem = `${json?.message ?? ''} ${json?.feedback_title ?? ''}`.toLowerCase();
  if (status === 429 || /checkpoint|feedback_required|wait a few minutes|tente novamente mais tarde|spam/.test(mensagem)) {
    throw new BloqueioInstagram(`Instagram sinalizou limite (${status}): ${mensagem.trim() || 'sem detalhes'}`);
  }
  if (status === 401 || status === 403 || json?.require_login) {
    throw new Error('Sessão do Instagram expirou. Rode "npm run ig:login".');
  }
  if (status !== 200 || !json) {
    const erro = new Error(`Instagram respondeu ${status} em ${caminho}`);
    erro.status = status;
    throw erro;
  }
  return json;
}

export async function buscarPerfil(pagina, username) {
  try {
    const json = await igApi(pagina, `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`);
    return json?.data?.user ?? null;
  } catch (erro) {
    if (erro.status === 404) return null;
    throw erro;
  }
}

export async function fecharPopups(pagina) {
  for (let i = 0; i < 3; i++) {
    const botao = pagina.getByRole('button', { name: /^(agora não|not now)$/i }).first();
    if (!(await botao.isVisible().catch(() => false))) return;
    await botao.click().catch(() => {});
    await sleep(800);
  }
}

// Digita e envia cada mensagem na conversa, como alguém faria no teclado
export async function enviarMensagens(pagina, threadId, textos) {
  await pagina.goto(`https://www.instagram.com/direct/t/${threadId}/`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await fecharPopups(pagina);

  const caixa = pagina.locator('div[role="textbox"][contenteditable="true"]').first();
  try {
    await caixa.waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    throw new FalhaEnvio('Não encontrei a caixa de mensagem na conversa (o Instagram pode ter mudado o layout).');
  }

  for (const texto of textos) {
    await caixa.click();
    await pagina.keyboard.insertText(texto.replace(/\s*\n+\s*/g, ' ').trim());
    await sleep(800 + Math.random() * 1200);
    await pagina.keyboard.press('Enter');
    await sleep(2500 + Math.random() * 3000);
  }
}

export const tsMs = (timestamp) => Math.floor(Number(timestamp) / 1000);

export function textoDoItem(item) {
  if (item.text) return item.text;
  if (item.link?.text) return item.link.text;
  const tipos = {
    voice_media: '[áudio]',
    media: '[foto ou vídeo]',
    media_share: '[compartilhou um post]',
    clip: '[compartilhou um reel]',
    reel_share: '[respondeu um story]',
    story_share: '[compartilhou um story]',
    like: '[curtida]',
    animated_media: '[figurinha]',
    raven_media: '[foto temporária]',
  };
  return tipos[item.item_type] ?? `[${item.item_type ?? 'mensagem'}]`;
}
