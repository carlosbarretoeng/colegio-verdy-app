/**
 * importStudents.mjs
 * ------------------
 * Lê um CSV e insere alunos no Firestore com suporte a múltiplos responsáveis.
 *
 * Formato: UMA LINHA POR VÍNCULO de responsável.
 * Se um aluno não tem responsável, usa uma única linha com as colunas de
 * responsável em branco.
 * Alunos com o mesmo par (nome + turma) são agrupados automaticamente.
 *
 * Colunas obrigatórias:
 *   nome   — nome completo do aluno
 *   turma  — nome da turma (deve existir na coleção `classrooms`)
 *
 * Colunas opcionais:
 *   responsavel        — username do responsável (ex: maria.silva)
 *   parentesco         — ex: Mãe, Pai, Avó, Tio
 *   contato_emergencia — sim | nao  (padrão: nao)
 *   pode_buscar        — sim | nao  (padrão: sim)
 *   foto_url           — URL da foto do aluno (gera avatar se vazio)
 *
 * Exemplo de CSV:
 *   nome,turma,responsavel,parentesco,contato_emergencia,pode_buscar,foto_url
 *   Ana Beatriz,1A,maria.silva,Mãe,sim,sim,
 *   Ana Beatriz,1A,joao.santos,Pai,nao,sim,
 *   Bruno Costa,1A,carlos.junior,Pai,sim,sim,
 *   Carla Mendes,1B,,,,,
 *
 * Uso (dentro de functions/):
 *   npm run import-students -- ../db/alunos.csv
 *   npm run import-students -- ../db/alunos.csv --dry-run
 *   npm run import-students -- ../db/alunos.csv --project colegio-verdy
 */

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import process from 'node:process';

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const buildAvatarUrl = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Aluno')}&background=e2e8f0&color=0f172a`;

const normalizeUsername = (value) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

const parseBoolean = (value, defaultVal) => {
    const v = (value || '').trim().toLowerCase();
    if (v === 'sim' || v === 's' || v === 'true' || v === '1') return true;
    if (v === 'nao' || v === 'não' || v === 'n' || v === 'false' || v === '0') return false;
    return defaultVal;
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function getFlag(flag) {
    const i = process.argv.indexOf(flag);
    return i === -1 ? null : process.argv[i + 1] ?? null;
}
function hasFlag(flag) { return process.argv.includes(flag); }
function getPositionals() { return process.argv.slice(2).filter((v) => !v.startsWith('--')); }

// ---------------------------------------------------------------------------
// Credencial / projectId
// ---------------------------------------------------------------------------

function getProjectIdFromFirebaseRc() {
    try {
        const p = path.resolve(process.cwd(), '../.firebaserc');
        return JSON.parse(fs.readFileSync(p, 'utf-8'))?.projects?.default ?? null;
    } catch { return null; }
}

function resolveProjectId(cliProject) {
    return cliProject
        || process.env.FIREBASE_PROJECT_ID
        || process.env.GCLOUD_PROJECT
        || process.env.GOOGLE_CLOUD_PROJECT
        || getProjectIdFromFirebaseRc();
}

function resolveCredential() {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
        try { return admin.credential.cert(JSON.parse(json)); }
        catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido.'); }
    }
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (filePath) {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) throw new Error(`Service account não encontrada em: ${resolved}`);
        return admin.credential.cert(JSON.parse(fs.readFileSync(resolved, 'utf-8')));
    }
    for (const candidate of [
        path.resolve(process.cwd(), 'service-account.json'),
        path.resolve(import.meta.dirname, '..', 'service-account.json'),
    ]) {
        if (fs.existsSync(candidate)) {
            console.log(`🔑  Usando credencial local: ${candidate}`);
            return admin.credential.cert(JSON.parse(fs.readFileSync(candidate, 'utf-8')));
        }
    }
    return admin.credential.applicationDefault();
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

async function parseCSV(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) throw new Error(`Arquivo não encontrado: ${resolved}`);

    const rows = [];
    const warnings = [];
    const rl = readline.createInterface({ input: fs.createReadStream(resolved, 'utf-8'), crlfDelay: Infinity });

    let lineNumber = 0;
    let headers = null;

    for await (const raw of rl) {
        lineNumber++;
        const line = raw.trim();
        if (!line) continue;

        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)
            ?.map((c) => c.replace(/^"|"$/g, '').trim())
            ?? line.split(',').map((c) => c.trim());

        if (lineNumber === 1) {
            headers = cols.map((h) => h.toLowerCase());
            const missing = ['nome', 'turma'].filter((r) => !headers.includes(r));
            if (missing.length) throw new Error(`Colunas obrigatórias ausentes no CSV: ${missing.join(', ')}`);
            continue;
        }

        const row = {};
        headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });

        const nome  = (row.nome  || '').trim();
        const turma = (row.turma || '').trim();

        if (!nome)  { warnings.push(`Linha ${lineNumber}: nome vazio — ignorado.`); continue; }
        if (!turma) { warnings.push(`Linha ${lineNumber}: turma vazia para "${nome}" — ignorado.`); continue; }

        rows.push({
            nome,
            turmaNome: turma,
            responsavelUsername: normalizeUsername(row.responsavel || ''),
            parentesco: (row.parentesco || '').trim(),
            contatoEmergencia: parseBoolean(row.contato_emergencia, false),
            podeBuscar: parseBoolean(row.pode_buscar, true),
            fotoUrl: (row.foto_url || '').trim(),
            lineNumber,
        });
    }

    return { rows, warnings };
}

// ---------------------------------------------------------------------------
// Agrupar linhas → alunos com lista de responsáveis
// ---------------------------------------------------------------------------

function groupStudents(rows) {
    // Chave de agrupamento: nome + turma (case-insensitive)
    const map = new Map();

    for (const row of rows) {
        const key = `${row.nome.toLowerCase()}||${row.turmaNome.toLowerCase()}`;

        if (!map.has(key)) {
            map.set(key, {
                nome: row.nome,
                turmaNome: row.turmaNome,
                fotoUrl: row.fotoUrl,
                vinculos: [],
            });
        }

        const student = map.get(key);

        // Atualiza fotoUrl com o primeiro valor não-vazio encontrado
        if (!student.fotoUrl && row.fotoUrl) student.fotoUrl = row.fotoUrl;

        if (row.responsavelUsername) {
            // Evita duplicata do mesmo responsável no mesmo aluno
            const jaTem = student.vinculos.some((v) => v.username === row.responsavelUsername);
            if (!jaTem) {
                student.vinculos.push({
                    username: row.responsavelUsername,
                    parentesco: row.parentesco,
                    contatoEmergencia: row.contatoEmergencia,
                    podeBuscar: row.podeBuscar,
                });
            }
        }
    }

    return [...map.values()];
}

// ---------------------------------------------------------------------------
// Cache de turmas e responsáveis
// ---------------------------------------------------------------------------

async function buildTurmaMap(db) {
    const snap = await db.collection('classrooms').get();
    const map = {};
    snap.docs.forEach((d) => {
        const nome = (d.data().nome || '').trim();
        if (nome) map[nome.toLowerCase()] = { id: d.id, nome };
    });
    return map;
}

async function buildUserMap(db) {
    // username → dados do usuário
    const usernameSnap = await db.collection('usernames').get();
    const uidMap = {}; // username → uid
    usernameSnap.docs.forEach((d) => { uidMap[d.id] = d.data().uid || null; });

    // uid → dados (nome, email, telefone, avatarUrl)
    const usersSnap = await db.collection('users').get();
    const userData = {};
    usersSnap.docs.forEach((d) => { userData[d.id] = d.data(); });

    return { uidMap, userData };
}

// ---------------------------------------------------------------------------
// Inserir aluno
// ---------------------------------------------------------------------------

async function insertStudent({ nome, turmaNome, turmaId, vinculos, fotoUrl, userMap, db, dryRun }) {
    if (dryRun) {
        return { status: 'dry-run', nome, turmaNome, totalVinculos: vinculos.length };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const foto = fotoUrl || buildAvatarUrl(nome);

    // Resolve cada vínculo para os dados completos do responsável
    const responsaveisArr = [];
    const responsaveisIds = [];
    const vinculosNaoEncontrados = [];

    for (const v of vinculos) {
        const uid = userMap.uidMap[v.username] ?? null;
        if (!uid) { vinculosNaoEncontrados.push(v.username); continue; }

        const rd = userMap.userData[uid] || {};
        responsaveisArr.push({
            responsavelId: uid,
            nome:             rd.nome || '',
            email:            rd.email || rd.authEmail || '',
            telefone:         rd.telefone || '',
            avatarUrl:        rd.avatarUrl || '',
            parentesco:       v.parentesco,
            podeBuscar:       v.podeBuscar,
            contatoEmergencia: v.contatoEmergencia,
        });
        responsaveisIds.push(uid);
    }

    const ref = await db.collection('students').add({
        nome,
        turmaId,
        fotoUrl: foto,
        status: 'ativo',
        responsaveis: responsaveisArr,
        responsaveisIds,
        createdAt: now,
        updatedAt: now,
    });

    return {
        status: 'created',
        nome,
        turmaNome,
        id: ref.id,
        totalVinculos: responsaveisArr.length,
        vinculosNaoEncontrados,
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const [csvPath] = getPositionals();
    const dryRun     = hasFlag('--dry-run');
    const cliProject = getFlag('--project');

    if (!csvPath) {
        console.error('Uso: npm run import-students -- <arquivo.csv> [--dry-run] [--project <id>]');
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

    const db = admin.firestore();

    console.log(`\n📋  Projeto : ${projectId}`);
    console.log(`📄  CSV     : ${path.resolve(csvPath)}`);
    if (dryRun) console.log('⚠️   Modo dry-run — nenhum dado será gravado no Firebase.\n');

    // Lê e agrupa CSV
    let rows, warnings;
    try {
        ({ rows, warnings } = await parseCSV(csvPath));
    } catch (err) {
        console.error(`❌  Erro ao ler CSV: ${err.message}`);
        process.exit(1);
    }

    if (warnings.length) {
        console.warn('\n⚠️  Avisos de validação:');
        warnings.forEach((w) => console.warn(`   ${w}`));
    }

    if (!rows.length) {
        console.log('\nNenhuma linha válida encontrada. Encerrando.');
        process.exit(0);
    }

    const students = groupStudents(rows);
    console.log(`\n   ${rows.length} linha(s) → ${students.length} aluno(s) únicos`);

    // Carrega turmas e usuários do Firestore
    console.log('\n🔍  Carregando turmas e usuários...');
    const [turmaMap, userMap] = await Promise.all([
        buildTurmaMap(db),
        buildUserMap(db),
    ]);
    console.log(`   ${Object.keys(turmaMap).length} turma(s)  |  ${Object.keys(userMap.uidMap).length} username(s)`);

    // Avisa sobre turmas não encontradas
    const turmasNaoEncontradas = new Set(
        students.filter((s) => !turmaMap[s.turmaNome.toLowerCase()]).map((s) => s.turmaNome)
    );
    if (turmasNaoEncontradas.size) {
        console.warn('\n⚠️  Turmas não encontradas — alunos serão pulados:');
        turmasNaoEncontradas.forEach((t) => console.warn(`   "${t}"`));
    }

    console.log(`\n🚀  Inserindo ${students.length} aluno(s)...\n`);

    const results = { created: 0, skipped: 0, failed: 0, dryRun: 0 };

    for (const student of students) {
        const label = student.nome.padEnd(35);
        process.stdout.write(`   ${label} `);

        const turmaEntry = turmaMap[student.turmaNome.toLowerCase()];
        if (!turmaEntry) {
            results.skipped++;
            console.log(`⏭️   pulado  (turma "${student.turmaNome}" não encontrada)`);
            continue;
        }

        try {
            const result = await insertStudent({
                nome: student.nome,
                turmaNome: turmaEntry.nome,
                turmaId: turmaEntry.id,
                vinculos: student.vinculos,
                fotoUrl: student.fotoUrl,
                userMap,
                db,
                dryRun,
            });

            if (result.status === 'created') {
                results.created++;
                const respInfo = result.totalVinculos > 0
                    ? `${result.totalVinculos} responsável(is)`
                    : 'sem responsável';
                const aviso = result.vinculosNaoEncontrados?.length
                    ? ` ⚠️  não encontrados: ${result.vinculosNaoEncontrados.join(', ')}`
                    : '';
                console.log(`✅  criado  → ${turmaEntry.nome}  [${respInfo}]${aviso}`);
            } else {
                results.dryRun++;
                const respInfo = student.vinculos.length > 0
                    ? `${student.vinculos.length} responsável(is)`
                    : 'sem responsável';
                console.log(`🔍  dry-run → ${turmaEntry.nome}  [${respInfo}]`);
            }
        } catch (err) {
            results.failed++;
            console.log(`❌  erro    : ${err.message}`);
        }
    }

    // Resumo
    console.log('\n─────────────────────────────────────────');
    if (dryRun) {
        console.log(`✅  Validados : ${results.dryRun}`);
    } else {
        console.log(`✅  Criados   : ${results.created}`);
        console.log(`⏭️   Pulados  : ${results.skipped}`);
        console.log(`❌  Com erro  : ${results.failed}`);
    }
    if (warnings.length) console.log(`⚠️   Avisos  : ${warnings.length}`);
    console.log('─────────────────────────────────────────\n');

    if (results.failed > 0) process.exit(1);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Erro fatal:', err.message);
        process.exit(1);
    });
