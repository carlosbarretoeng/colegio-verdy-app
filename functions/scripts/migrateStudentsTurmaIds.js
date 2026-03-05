// Script para migrar alunos do campo turmaId para turmaIds (array)
// Execute via: node functions/scripts/migrateStudentsTurmaIds.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../service-account.json');

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});
const db = getFirestore();

async function migrateStudentsTurmaIds() {
  const studentsRef = db.collection('students');
  const snapshot = await studentsRef.get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.turmaId && !Array.isArray(data.turmaIds)) {
      await doc.ref.update({
        turmaIds: [data.turmaId],
        turmaId: null,
        updatedAt: new Date()
      });
      count++;
      console.log(`Aluno ${doc.id} migrado para turmaIds.`);
    }
  }

  console.log(`Migração concluída. ${count} alunos atualizados.`);
}

migrateStudentsTurmaIds().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
