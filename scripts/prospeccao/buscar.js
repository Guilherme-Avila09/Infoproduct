// Encontra influenciadores do nicho, confere o perfil e coloca os aprovados na fila de envio.
//   npm run ig:buscar                         busca pelos termos do config
//   npm run ig:buscar -- --perfis ana,joao    confere perfis específicos
//   npm run ig:buscar -- --so-busca           só lista os candidatos, sem abrir perfis

import { config, mensagens } from './lib/config.js';
import { abrirNavegador, paginaInstagram, estaLogado, buscarPerfil, BloqueioInstagram } from './lib/instagram.js';
import { carregarLeads, atualizarLead } from './lib/leads.js';
import { detectarTema, preencher, primeiroNome } from './lib/mensagens.js';
import { log, esperarSeg, embaralhar, sortear, agora } from './lib/util.js';

const args = process.argv.slice(2);
const SO_BUSCA = args.includes('--so-busca');
const posPerfis = args.indexOf('--perfis');
const perfisManuais = posPerfis >= 0
  ? (args[posPerfis + 1] ?? '').split(',').map((s) => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
  : [];

const RESERVADOS = new Set([
  'p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts', 'direct', 'about', 'legal',
  'developer', 'web', 'popular', 'tags', 'locations', 'challenge', 'privacy', 'terms',
]);

const LIMITE = config.busca.max_perfis_verificados_por_rodada;

function usernameDoLink(href) {
  let url = href;
  try {
    if (href.includes('uddg=')) url = new URL(href, 'https://duckduckgo.com').searchParams.get('uddg') ?? '';
  } catch {
    return null;
  }
  const m = url.match(/^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,30})(?:[/?#]|$)/i);
  if (!m) return null;
  const username = m[1].toLowerCase();
  return RESERVADOS.has(username) ? null : username;
}

async function buscarCandidatos(pagina, conhecidos) {
  const achados = new Set();
  for (const termo of embaralhar(config.busca.termos)) {
    if (achados.size >= LIMITE * 3) break;
    const consulta = `site:instagram.com ${termo}`;
    log(`Buscando: ${consulta}`);
    try {
      await pagina.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(consulta)}&kl=br-pt`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      const links = await pagina.$$eval('a.result__a, a.result__url', (as) => as.map((a) => a.getAttribute('href') ?? ''));
      if (!links.length) log('  Nenhum resultado (a busca pode ter pedido verificação).');
      for (const href of links) {
        const username = usernameDoLink(href);
        if (username && !conhecidos.has(username)) achados.add(username);
      }
    } catch (erro) {
      if (/has been closed/.test(erro.message)) throw new Error('O navegador foi fechado. Deixe a janela aberta enquanto o comando roda.');
      log(`  Falha nessa busca: ${erro.message}`);
    }
    log(`  ${achados.size} candidatos até agora`);
    await esperarSeg(config.busca.intervalo_entre_buscas_seg);
  }
  return [...achados];
}

function avaliar(user) {
  const f = config.filtros;
  const seguidores = user.edge_followed_by?.count ?? 0;
  const midia = user.edge_owner_to_timeline_media ?? {};
  const posts = (midia.edges ?? []).map((e) => e.node);

  if (user.is_private) return { ok: false, motivo: 'perfil privado' };
  if (seguidores < f.seguidores_min || seguidores > f.seguidores_max) {
    return { ok: false, motivo: `${seguidores} seguidores, fora da faixa` };
  }
  if ((midia.count ?? 0) < f.min_publicacoes) return { ok: false, motivo: `só ${midia.count ?? 0} publicações` };

  const ultimoPost = posts[0]?.taken_at_timestamp;
  const dias = ultimoPost ? (Date.now() / 1000 - ultimoPost) / 86400 : Infinity;
  if (dias > f.ultimo_post_max_dias) return { ok: false, motivo: 'sem postar há mais de ' + f.ultimo_post_max_dias + ' dias' };

  const legendas = posts
    .slice(0, 6)
    .map((p) => p.edge_media_to_caption?.edges?.[0]?.node?.text ?? '')
    .filter(Boolean);
  const tema = detectarTema([user.full_name, user.biography, user.category_name, ...legendas].join(' '), config.temas);
  if (!tema) return { ok: false, motivo: 'não parece ser do nicho' };

  const curtidas = posts.slice(0, 9).map((p) => Math.max(0, p.edge_liked_by?.count ?? p.edge_media_preview_like?.count ?? 0));
  const engajamento = curtidas.length ? (curtidas.reduce((a, b) => a + b, 0) / curtidas.length / seguidores) * 100 : 0;
  if (engajamento < f.engajamento_min_pct) return { ok: false, motivo: `engajamento ${engajamento.toFixed(1)}%` };

  return {
    ok: true,
    tema,
    seguidores,
    publicacoes: midia.count,
    ultimo_post: new Date(ultimoPost * 1000).toISOString(),
    engajamento_pct: Number(engajamento.toFixed(1)),
    legendas: legendas.slice(0, 3).map((l) => l.slice(0, 300)),
  };
}

const conhecidos = new Set([...Object.keys(carregarLeads()), config.conta_instagram.toLowerCase()]);
const contexto = await abrirNavegador();

try {
  let candidatos;
  if (perfisManuais.length) {
    candidatos = perfisManuais.filter((u) => !conhecidos.has(u));
  } else {
    const paginaBusca = await contexto.newPage();
    candidatos = await buscarCandidatos(paginaBusca, conhecidos);
    await paginaBusca.close();
  }

  if (SO_BUSCA) {
    log(`Candidatos encontrados (${candidatos.length}):`);
    console.log(candidatos.map((u) => `  @${u}`).join('\n'));
  } else {
    const ig = await paginaInstagram(contexto);
    if (!(await estaLogado(ig))) {
      throw new Error('O navegador não está logado no Instagram. Rode "npm run ig:login" primeiro.');
    }

    let verificados = 0;
    let aprovados = 0;
    for (const username of candidatos) {
      if (verificados >= LIMITE) break;
      verificados++;

      let user;
      try {
        user = await buscarPerfil(ig, username);
      } catch (erro) {
        if (erro instanceof BloqueioInstagram) throw erro;
        log(`@${username}: não consegui abrir (${erro.message})`);
        await esperarSeg(config.busca.intervalo_entre_perfis_seg);
        continue;
      }

      const resultado = user ? avaliar(user) : { ok: false, motivo: 'perfil não encontrado' };
      if (!resultado.ok) {
        atualizarLead(username, () => ({ status: 'reprovado', motivo: resultado.motivo, encontrado_em: agora() }));
        log(`@${username}: reprovado, ${resultado.motivo}`);
      } else {
        const { ok, ...dados } = resultado;
        const primeiro_nome = primeiroNome(user.full_name);
        atualizarLead(username, () => ({
          ...dados,
          status: 'novo',
          nome: user.full_name,
          primeiro_nome,
          bio: user.biography,
          categoria: user.category_name,
          mensagem_inicial: preencher(sortear(mensagens.primeiro_contato), { primeiro_nome, tema: dados.tema }),
          encontrado_em: agora(),
        }));
        aprovados++;
        log(`@${username}: APROVADO (${dados.seguidores} seguidores, ${dados.tema}, ${dados.engajamento_pct}% engajamento)`);
      }
      await esperarSeg(config.busca.intervalo_entre_perfis_seg);
    }

    log(`Fim: ${verificados} perfis conferidos, ${aprovados} aprovados. Rode "npm run ig:fila" pra enviar as mensagens.`);
  }
} catch (erro) {
  if (erro instanceof BloqueioInstagram) {
    console.error(`\nPAREI: ${erro.message}\nDeixe a conta descansar pelo menos 24 horas antes de rodar de novo.`);
    process.exitCode = 2;
  } else {
    console.error(`\nErro: ${erro.message}`);
    process.exitCode = 1;
  }
} finally {
  await contexto.close();
}
