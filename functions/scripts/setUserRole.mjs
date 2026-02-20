import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const VALID_ROLES = new Set(['admin', 'teacher', 'parent']);

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function getPositionalArgs() {
  return process.argv
    .slice(2)
    .filter((value) => !value.startsWith('--'));
}

function getProjectIdFromFirebaseRc() {
  try {
    const firebaseRcPath = path.resolve(process.cwd(), '../.firebaserc');
    const raw = fs.readFileSync(firebaseRcPath, 'utf-8');
    const parsed = JSON.parse(raw);
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
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      return admin.credential.cert(JSON.parse(serviceAccountJson));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido (JSON malformado).');
    }
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Service account não encontrada em: ${resolvedPath}`);
    }
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    return admin.credential.cert(JSON.parse(raw));
  }

  return admin.credential.applicationDefault();
}

const [emailArg, roleArg] = getPositionalArgs();
const cliProject = getArgValue('--project');

if (!emailArg || !roleArg) {
  console.error('Uso: npm run set-role -- <email> <admin|teacher|parent> [--project <projectId>]');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const role = roleArg.trim().toLowerCase();

if (!VALID_ROLES.has(role)) {
  console.error(`Role inválida: ${role}. Use admin, teacher ou parent.`);
  process.exit(1);
}

const projectId = resolveProjectId(cliProject);

if (!projectId) {
  console.error('Project ID não encontrado. Use --project <projectId> ou configure FIREBASE_PROJECT_ID.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: resolveCredential(),
    projectId
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const user = await auth.getUserByEmail(email);

  await auth.setCustomUserClaims(user.uid, { role });

  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email ?? email,
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  console.log(`Perfil atualizado com sucesso: ${email} -> ${role}`);
  console.log(`UID: ${user.uid}`);
  console.log(`Projeto: ${projectId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro ao atualizar perfil:', error.message || error);
    if (String(error?.message || '').includes('Could not load the default credentials')) {
      console.error('Defina FIREBASE_SERVICE_ACCOUNT_PATH (ou GOOGLE_APPLICATION_CREDENTIALS) com o JSON da service account.');
    }
      if (String(error?.message || '').includes('Service account não encontrada')) {
        console.error('Baixe a chave em Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada.');
      }
    process.exit(1);
  });
