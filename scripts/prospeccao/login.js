import { abrirNavegador, estaLogado } from './lib/instagram.js';
import { log, sleep } from './lib/util.js';
import { config } from './lib/config.js';

const contexto = await abrirNavegador();
const pagina = contexto.pages()[0] ?? (await contexto.newPage());
await pagina.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });

log(`Faça login no @${config.conta_instagram} na janela que abriu. Vou esperar até 10 minutos.`);

for (let i = 0; i < 300; i++) {
  if (await estaLogado(pagina)) {
    log('Login feito e salvo. Nas próximas vezes os comandos já entram logados.');
    await sleep(3000);
    await contexto.close();
    process.exit(0);
  }
  await sleep(2000);
}

log('Tempo esgotado sem login. Rode "npm run ig:login" de novo.');
await contexto.close();
process.exit(1);
