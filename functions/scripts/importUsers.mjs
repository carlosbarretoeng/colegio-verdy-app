/**
 * importUsers.mjs
 * ---------------
 * Lê um CSV com as colunas  username,nome,role  e cria os usuários no sistema.
 *
 * Uso (dentro da pasta functions/):
 *   npm run import-users -- ../db/usuarios.csv
 *   npm run import-users -- ../db/usuarios.csv --password Verdy@2026
 *   npm run import-users -- ../db/usuarios.csv --dry-run
 *   npm run import-users -- ../db/usuarios.csv --project colegio-verdy
 *
 * Flags:
 *   --password <senha>   Senha padrão para todos os usuários  (padrão: Verdy@2025)
 *   --dry-run            Valida o CSV sem criar nada no Firebase
 *   --project <id>       Sobrescreve o projectId lido do .firebaserc
 */

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import process from 'node:process';

// ---------------------------------------------------------------------------
// Utilitários (espelham a lógica do AuthContext.jsx)
// ---------------------------------------------------------------------------

const VALID_ROLES = new Set(['admin', 'teacher', 'parent']);
const DEFAULT_PASSWORD = 'colegioverdy';

const normalizeUsername = (value) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

const buildAuthEmail = (username) => `${username}@usuario.verdy.app`;

const buildAvatarUrl = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Usuario')}&background=e2e8f0&color=0f172a`;

// ---------------------------------------------------------------------------
// Argumentos de linha de comando
// ---------------------------------------------------------------------------

function getFlag(flag) {
    const i = process.argv.indexOf(flag);
    return i === -1 ? null : process.argv[i + 1] ?? null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function getPositionals() {
    return process.argv.slice(2).filter((v) => !v.startsWith('--'));
}

// ---------------------------------------------------------------------------
// Credencial e projectId
// ---------------------------------------------------------------------------

function getProjectIdFromFirebaseRc() {
    try {
        const p = path.resolve(process.cwd(), '../.firebaserc');
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return parsed?.projects?.default ?? null;
    } catch {
        return null;
    }
}

function resolveProjectId(cliProject) {
    return (
        cliProject ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        getProjectIdFromFirebaseRc()
    );
}

function resolveCredential() {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
        try { return admin.credential.cert(JSON.parse(json)); }
        catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido (JSON malformado).'); }
    }
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (filePath) {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) throw new Error(`Service account não encontrada em: ${resolved}`);
        return admin.credential.cert(JSON.parse(fs.readFileSync(resolved, 'utf-8')));
    }
    // Fallback: procura service-account.json na pasta functions/ (cwd ou um nível acima do script)
    const candidates = [
        path.resolve(process.cwd(), 'service-account.json'),
        path.resolve(import.meta.dirname, '..', 'service-account.json'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            console.log(`🔑  Usando credencial local: ${candidate}`);
            return admin.credential.cert(JSON.parse(fs.readFileSync(candidate, 'utf-8')));
        }
    }
    return admin.credential.applicationDefault();
}

// ---------------------------------------------------------------------------
// Leitura do CSV
// ---------------------------------------------------------------------------

async function parseCSV(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) throw new Error(`Arquivo não encontrado: ${resolved}`);

    const rows = [];
    const errors = [];

    const rl = readline.createInterface({
        input: fs.createReadStream(resolved, 'utf-8'),
        crlfDelay: Infinity,
    });

    let lineNumber = 0;
    let headers = null;

    for await (const raw of rl) {
        lineNumber++;
        const line = raw.trim();
        if (!line) continue; // linha em branco

        // Suporte básico a CSV: split por vírgula respeitando aspas duplas
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((c) => c.replace(/^"|"$/g, '').trim()) ?? line.split(',').map((c) => c.trim());

        if (lineNumber === 1) {
            headers = cols.map((h) => h.toLowerCase());
            const required = ['username', 'nome', 'role'];
            const missing = required.filter((r) => !headers.includes(r));
            if (missing.length > 0) throw new Error(`Colunas obrigatórias ausentes no CSV: ${missing.join(', ')}`);
            continue;
        }

        const row = {};
        headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });

        const rawUsername = (row.username || '').trim();
        const nome        = (row.nome     || '').trim();
        const role        = (row.role     || '').trim().toLowerCase();

        const username = normalizeUsername(rawUsername);

        if (!username || username.length < 3) {
            errors.push(`Linha ${lineNumber}: username inválido ("${rawUsername}") — ignorado.`);
            continue;
        }
        if (!nome) {
            errors.push(`Linha ${lineNumber}: nome vazio para username "${username}" — ignorado.`);
            continue;
        }
        if (!VALID_ROLES.has(role)) {
            errors.push(`Linha ${lineNumber}: role inválida "${role}" para "${username}" — use admin, teacher ou parent.`);
            continue;
        }

        rows.push({ username, nome, role, lineNumber });
    }

    return { rows, errors };
}

// ---------------------------------------------------------------------------
// Criação de um usuário
// ---------------------------------------------------------------------------

async function createUser({ username, nome, role, password, auth, db, dryRun }) {
    const authEmail  = buildAuthEmail(username);
    const avatarUrl  = buildAvatarUrl(nome);

    if (dryRun) {
        return { status: 'dry-run', username, authEmail };
    }

    // Verifica se o username já está em uso no Firestore
    const usernameRef  = db.collection('usernames').doc(username);
    const usernameSnap = await usernameRef.get();
    if (usernameSnap.exists) {
        return { status: 'skipped', username, reason: 'username já existe no Firestore' };
    }

    // Verifica se o auth email já existe
    let uid;
    try {
        const existing = await auth.getUserByEmail(authEmail);
        return { status: 'skipped', username, reason: `auth email já existe (uid: ${existing.uid})` };
    } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
        // Usuário não existe — podemos criar
    }

    // Cria o usuário no Firebase Auth
    const userRecord = await auth.createUser({
        email:    authEmail,
        password: password,
        displayName: nome,
    });
    uid = userRecord.uid;

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Cria o documento em users/{uid}
    await db.collection('users').doc(uid).set({
        uid,
        email:     null,          // email real não informado
        authEmail,
        username,
        role,
        nome,
        telefone:  '',
        disciplina: '',
        avatarUrl,
        createdAt: now,
        updatedAt: now,
    });

    // Cria o documento em usernames/{username}
    await usernameRef.set({ email: authEmail, uid });

    return { status: 'created', username, uid, authEmail };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const [csvPath] = getPositionals();
    const password  = getFlag('--password') || DEFAULT_PASSWORD;
    const dryRun    = hasFlag('--dry-run');
    const cliProject = getFlag('--project');

    if (!csvPath) {
        console.error('Uso: npm run import-users -- <arquivo.csv> [--password <senha>] [--dry-run] [--project <id>]');
        process.exit(1);
    }

    const projectId = resolveProjectId(cliProject);
    if (!projectId) {
        console.error('Project ID não encontrado. Use --project <id> ou configure FIREBASE_PROJECT_ID.');
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({ credential: resolveCredential(), projectId });
    }

    const auth = admin.auth();
    const db   = admin.firestore();

    console.log(`\n📋  Projeto : ${projectId}`);
    console.log(`📄  CSV     : ${path.resolve(csvPath)}`);
    console.log(`🔑  Senha   : ${dryRun ? '(dry-run)' : password}`);
    if (dryRun) console.log('⚠️   Modo dry-run — nenhum dado será gravado no Firebase.\n');

    // Lê e valida o CSV
    let rows, csvErrors;
    try {
        ({ rows, errors: csvErrors } = await parseCSV(csvPath));
    } catch (err) {
        console.error(`❌  Erro ao ler CSV: ${err.message}`);
        process.exit(1);
    }

    if (csvErrors.length > 0) {
        console.warn('\n⚠️  Avisos de validação do CSV:');
        csvErrors.forEach((e) => console.warn(`   ${e}`));
    }

    if (rows.length === 0) {
        console.log('\nNenhuma linha válida encontrada no CSV. Encerrando.');
        process.exit(0);
    }

    console.log(`\n🚀  Processando ${rows.length} usuário(s)...\n`);

    const results = { created: [], skipped: [], failed: [], dryRun: [] };

    for (const row of rows) {
        process.stdout.write(`   ${row.username.padEnd(30)} `);
        try {
            const result = await createUser({ ...row, password, auth, db, dryRun });
            if (result.status === 'created') {
                results.created.push(result);
                console.log(`✅  criado  (uid: ${result.uid})`);
            } else if (result.status === 'skipped') {
                results.skipped.push(result);
                console.log(`⏭️   pulado  (${result.reason})`);
            } else {
                results.dryRun.push(result);
                console.log(`🔍  dry-run  → ${result.authEmail}`);
            }
        } catch (err) {
            results.failed.push({ username: row.username, error: err.message });
            console.log(`❌  erro    : ${err.message}`);
        }
    }

    // Resumo
    console.log('\n─────────────────────────────────────────');
    if (dryRun) {
        console.log(`✅  Validados sem erros : ${results.dryRun.length}`);
    } else {
        console.log(`✅  Criados    : ${results.created.length}`);
        console.log(`⏭️   Pulados   : ${results.skipped.length}`);
        console.log(`❌  Com erro  : ${results.failed.length}`);
    }
    if (csvErrors.length > 0) console.log(`⚠️   Avisos CSV: ${csvErrors.length}`);
    console.log('─────────────────────────────────────────\n');

    if (results.failed.length > 0) process.exit(1);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Erro fatal:', err.message);
        process.exit(1);
    });
