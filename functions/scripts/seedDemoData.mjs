import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
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
    return admin.credential.cert(JSON.parse(serviceAccountJson));
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account não encontrada em: ${serviceAccountPath}`);
  }

  const raw = fs.readFileSync(serviceAccountPath, 'utf-8');
  return admin.credential.cert(JSON.parse(raw));
}

const cliProject = getArgValue('--project');
const projectId = resolveProjectId(cliProject);

if (!projectId) {
  console.error('Project ID não encontrado. Use --project <projectId>.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: resolveCredential(),
    projectId,
  });
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const teachers = [
  { id: 'seed-teacher-ana', nome: 'Ana Martins', email: 'ana.martins.demo@verdy.app', disciplina: 'Português', telefone: '(11) 90000-1001', status: 'ativo' },
  { id: 'seed-teacher-bruno', nome: 'Bruno Costa', email: 'bruno.costa.demo@verdy.app', disciplina: 'Matemática', telefone: '(11) 90000-1002', status: 'ativo' },
  { id: 'seed-teacher-carla', nome: 'Carla Souza', email: 'carla.souza.demo@verdy.app', disciplina: 'Ciências', telefone: '(11) 90000-1003', status: 'ativo' },
];

const parents = [
  { id: 'seed-parent-mariana', nome: 'Mariana Alves', email: 'mariana.alves.demo@verdy.app', telefone: '(11) 98888-2001', status: 'ativo' },
  { id: 'seed-parent-rodrigo', nome: 'Rodrigo Lima', email: 'rodrigo.lima.demo@verdy.app', telefone: '(11) 98888-2002', status: 'ativo' },
  { id: 'seed-parent-patricia', nome: 'Patrícia Nunes', email: 'patricia.nunes.demo@verdy.app', telefone: '(11) 98888-2003', status: 'ativo' },
  { id: 'seed-parent-tiago', nome: 'Tiago Mendes', email: 'tiago.mendes.demo@verdy.app', telefone: '(11) 98888-2004', status: 'ativo' },
];

const classrooms = [
  { id: 'seed-class-1a', nome: '1º Ano A', periodo: 'Matutino', professorId: 'seed-teacher-ana', professorNome: 'Ana Martins', status: 'ativa' },
  { id: 'seed-class-2a', nome: '2º Ano A', periodo: 'Vespertino', professorId: 'seed-teacher-bruno', professorNome: 'Bruno Costa', status: 'ativa' },
  { id: 'seed-class-3a', nome: '3º Ano A', periodo: 'Integral', professorId: 'seed-teacher-carla', professorNome: 'Carla Souza', status: 'ativa' },
];

function parentById(id) {
  return parents.find((parent) => parent.id === id);
}

function responsavelVinculo(id, parentesco, podeBuscar, contatoEmergencia) {
  const parent = parentById(id);
  return {
    responsavelId: id,
    nome: parent?.nome || '',
    email: parent?.email || '',
    telefone: parent?.telefone || '',
    avatarUrl: '',
    parentesco,
    podeBuscar,
    contatoEmergencia,
  };
}

const students = [
  {
    id: 'seed-student-livia',
    nome: 'Lívia Fernandes',
    turmaId: 'seed-class-1a',
    status: 'ativo',
    fotoUrl: 'https://ui-avatars.com/api/?name=Livia+Fernandes&background=e2e8f0&color=0f172a',
    responsaveis: [
      responsavelVinculo('seed-parent-mariana', 'Mãe', true, true),
      responsavelVinculo('seed-parent-rodrigo', 'Pai', true, false),
    ],
  },
  {
    id: 'seed-student-gabriel',
    nome: 'Gabriel Alves',
    turmaId: 'seed-class-1a',
    status: 'ativo',
    fotoUrl: 'https://ui-avatars.com/api/?name=Gabriel+Alves&background=e2e8f0&color=0f172a',
    responsaveis: [
      responsavelVinculo('seed-parent-mariana', 'Mãe', true, true),
    ],
  },
  {
    id: 'seed-student-julia',
    nome: 'Júlia Nunes',
    turmaId: 'seed-class-2a',
    status: 'ativo',
    fotoUrl: 'https://ui-avatars.com/api/?name=Julia+Nunes&background=e2e8f0&color=0f172a',
    responsaveis: [
      responsavelVinculo('seed-parent-patricia', 'Mãe', true, true),
    ],
  },
  {
    id: 'seed-student-miguel',
    nome: 'Miguel Lima',
    turmaId: 'seed-class-2a',
    status: 'ativo',
    fotoUrl: 'https://ui-avatars.com/api/?name=Miguel+Lima&background=e2e8f0&color=0f172a',
    responsaveis: [
      responsavelVinculo('seed-parent-rodrigo', 'Pai', true, true),
    ],
  },
  {
    id: 'seed-student-heloisa',
    nome: 'Heloísa Mendes',
    turmaId: 'seed-class-3a',
    status: 'ativo',
    fotoUrl: 'https://ui-avatars.com/api/?name=Heloisa+Mendes&background=e2e8f0&color=0f172a',
    responsaveis: [
      responsavelVinculo('seed-parent-tiago', 'Pai', true, true),
    ],
  },
];

const events = [
  {
    id: 'seed-event-planejamento',
    titulo: 'Planejamento Pedagógico',
    tipo: 'Administrativos',
    data: '2026-03-02',
    local: 'Sala de Reuniões',
    descricao: '<p>Reunião de alinhamento com coordenação e docentes.</p>',
    diaTodo: false,
    horario: '08:30',
  },
  {
    id: 'seed-event-conselho',
    titulo: 'Conselho de Classe',
    tipo: 'Acadêmicos',
    data: '2026-03-10',
    local: 'Auditório Principal',
    descricao: '<p>Avaliação de desempenho das turmas e definição de ações.</p>',
    diaTodo: false,
    horario: '14:00',
  },
  {
    id: 'seed-event-feriado',
    titulo: 'Feriado Municipal',
    tipo: 'Feriado',
    data: '2026-03-19',
    local: 'Sem atividades presenciais',
    descricao: '<p>Suspensão das aulas conforme calendário oficial.</p>',
    diaTodo: true,
    horario: '',
  },
  {
    id: 'seed-event-recesso',
    titulo: 'Início do Recesso Escolar',
    tipo: 'Recesso',
    data: '2026-07-01',
    local: 'Unidade Escolar',
    descricao: '<p>Período de recesso das atividades letivas.</p>',
    diaTodo: true,
    horario: '',
  },
];

async function upsertCollection(collectionName, docs) {
  const batch = db.batch();
  docs.forEach((item) => {
    const ref = db.collection(collectionName).doc(item.id);
    batch.set(
      ref,
      {
        ...item,
        uid: item.uid || item.id,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  });
  await batch.commit();
}

async function main() {
  await upsertCollection(
    'users',
    teachers.map((teacher) => ({ ...teacher, role: 'teacher', uid: teacher.id, avatarUrl: '' }))
  );
  await upsertCollection(
    'users',
    parents.map((parent) => ({ ...parent, role: 'parent', uid: parent.id, avatarUrl: '' }))
  );
  await upsertCollection('classrooms', classrooms);
  await upsertCollection('students', students);
  await upsertCollection(
    'events',
    events.map((event) => ({
      ...event,
      anexoUrl: '',
      anexoNome: '',
      anexoMimeType: '',
      anexoPath: '',
    }))
  );

  console.log('Seed concluído com sucesso.');
  console.log(`Projeto: ${projectId}`);
  console.log('Coleções populadas: users, classrooms, students, events');
}

main().catch((error) => {
  console.error('Erro ao executar seed:', error.message || error);
  process.exit(1);
});
