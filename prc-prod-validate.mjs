/**
 * prc-prod-validate.mjs — Validação autenticada somente leitura em produção.
 * Execução: $env:M1M2_ADMIN_PASS="<senha>"; node prc-prod-validate.mjs
 */
import https from 'node:https';
import { execSync } from 'node:child_process';

const PROD = 'https://oba-doceria-gestao.pages.dev';
const PASS = process.env.M1M2_ADMIN_PASS;
if (!PASS) { console.log('ERRO: M1M2_ADMIN_PASS nao definida'); process.exit(1); }

function request(method, path, body, cookie = '') {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(PROD + path);
    const headers = { 'content-type': 'application/json' };
    if (cookie) headers['cookie'] = cookie;
    if (data) headers['content-length'] = Buffer.byteLength(data);
    const req = https.request({ hostname: u.hostname, port: 443, path: u.pathname + u.search, method, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d), setCookie: res.headers['set-cookie'] || [] }); } catch { resolve({ status: res.statusCode, body: d, setCookie: [] }); } });
    });
    req.on('error', e => resolve({ status: 0, body: e.message, setCookie: [] }));
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0, failed = 0;
function assert(ok, label) {
  if (ok) { console.log('  PASS  ' + label); passed++; }
  else     { console.error('  FAIL  ' + label); failed++; }
}

// Login
const login = await request('POST', '/api/auth/login', { email: 'admin@obadoceria.com.br', password: PASS });
assert(login.status === 200, 'Login: HTTP 200');
if (login.status !== 200) { console.log('ACAO: Verificar credenciais ou rollback Dashboard para bf6bb947'); process.exit(1); }

const sc = (login.setCookie || []).find(c => c.startsWith('__Host-oba_session='));
assert(!!sc, 'Login: cookie __Host-oba_session recebido');
if (!sc) { console.log('ACAO: Rollback Dashboard para bf6bb947'); process.exit(1); }
const cookie = sc.split(';')[0];

// Auth/me
const me = await request('GET', '/api/auth/me', null, cookie);
assert(me.status === 200, 'Auth/me: HTTP 200');
assert(me.body?.user?.role === 'admin', 'Auth/me: role=admin');

// Buscar insumos via API
const apiInsumos = await request('GET', '/api/data/insumos', null, cookie);
assert(apiInsumos.status === 200, 'GET /api/data/insumos: HTTP 200');
if (apiInsumos.status !== 200) { console.log('ACAO: Rollback Dashboard para bf6bb947'); process.exit(1); }

const records = Array.isArray(apiInsumos.body) ? apiInsumos.body : (apiInsumos.body?.records || []);
const apiIds = records.map(r => r.id).filter(Boolean);
console.log('  API insumos: ' + apiIds.length + ' registros');

// Buscar insumos via D1 direto
let d1Ids = [];
try {
  const d1Raw = execSync(
    'npx --yes wrangler@latest d1 execute oba-doceria-gestao-production --remote --command "SELECT id FROM records WHERE entity=\'insumos\' AND deleted_at IS NULL" --json',
    { cwd: 'p4-staging', encoding: 'utf-8', timeout: 30000 }
  );
  d1Ids = [...d1Raw.matchAll(/"id":\s*"([^"]*)"/g)].map(m => m[1]);
  console.log('  D1 insumos: ' + d1Ids.length + ' registros');
} catch (e) {
  console.log('FALHA: consulta D1 falhou: ' + e.message.substring(0, 100));
  console.log('ACAO: Rollback Dashboard para bf6bb947');
  process.exit(1);
}

// Comparar API vs D1
let match = apiIds.length === d1Ids.length;
apiIds.forEach(id => { if (!d1Ids.includes(id)) match = false; });
d1Ids.forEach(id => { if (!apiIds.includes(id)) match = false; });

if (!match) {
  console.log('FALHA: divergencia API (' + apiIds.length + ') vs D1 (' + d1Ids.length + ')');
  console.log('ACAO: Rollback Dashboard para bf6bb947 imediatamente');
  process.exit(1);
}
assert(match, 'API vs D1: contagem e IDs concordam (' + apiIds.length + ' insumos)');

// Verificar admin no D1
let adminOk = false;
try {
  const adminRaw = execSync(
    'npx --yes wrangler@latest d1 execute oba-doceria-gestao-production --remote --command "SELECT email, role, active FROM auth_users WHERE active=1" --json',
    { cwd: 'p4-staging', encoding: 'utf-8', timeout: 30000 }
  );
  adminOk = adminRaw.includes('admin@obadoceria');
} catch (e) {
  console.log('FALHA: consulta D1 admin falhou');
  console.log('ACAO: Rollback Dashboard para bf6bb947');
  process.exit(1);
}
assert(adminOk, 'D1 admin: admin@obadoceria.com.br presente e ativo');
if (!adminOk) { console.log('ACAO: Rollback Dashboard para bf6bb947'); process.exit(1); }

console.log('\n══════════════════════════════════════');
console.log('RESULTADO: ' + passed + ' PASS / ' + failed + ' FAIL');
console.log('══════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
