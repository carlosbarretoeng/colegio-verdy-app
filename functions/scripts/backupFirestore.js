// Script para backup do Firestore (coleções principais)
// Salva em um arquivo JSON e pode enviar por e-mail (exemplo: usando nodemailer)
// Execute via: node functions/scripts/backupFirestore.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../service-account.json');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');



initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});
const db = getFirestore();

async function backupCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  const collections = ['students', 'classrooms', 'users', 'cadernetaEntries', 'usernames'];
  const backup = {};

  for (const col of collections) {
    backup[col] = await backupCollection(col);
    console.log(`Backup da coleção ${col}: ${backup[col].length} documentos.`);
  }

  const backupFile = path.join(__dirname, `firestore-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log('Backup salvo em:', backupFile);

  // Compactar em ZIP
  const zipFile = backupFile.replace('.json', '.zip');
  const output = fs.createWriteStream(zipFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log('Arquivo ZIP criado:', zipFile, `${archive.pointer()} bytes`);
  });
  archive.on('error', (err) => { throw err; });

  archive.pipe(output);
  archive.file(backupFile, { name: path.basename(backupFile) });
  await archive.finalize();
}

main().catch((err) => {
  console.error('Erro no backup:', err);
  process.exit(1);
});
