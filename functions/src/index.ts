import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {randomUUID} from "crypto";

setGlobalOptions({maxInstances: 10});

initializeApp();

/**
 * Valida formato básico de e-mail.
 * @param {string} email E-mail informado.
 * @return {boolean} Se o formato é válido.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Retorna nome base a partir do e-mail quando necessário.
 * @param {string} email E-mail do usuário.
 * @return {string} Nome derivado.
 */
function getNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "Usuário";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();
  return normalized || "Usuário";
}

/**
 * Cria URL de avatar padrão para o usuário.
 * @param {string} name Nome a exibir no avatar.
 * @return {string} URL do avatar.
 */
function buildAvatarUrl(name: string): string {
  const safeName = encodeURIComponent(name || "Usuário");
  return (
    "https://ui-avatars.com/api/?name=" +
    safeName +
    "&background=e2e8f0&color=0f172a"
  );
}

/**
 * Cria conta de professor via admin e prepara perfil no Firestore.
 * Apenas usuários com role admin podem executar.
 */
export const createTeacherAccount = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const db = getFirestore();
  const auth = getAuth();

  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;

  if (callerRole !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem cadastrar professores."
    );
  }

  const data = (request.data || {}) as {
    nome?: unknown;
    email?: unknown;
    disciplina?: unknown;
    telefone?: unknown;
    avatarUrl?: unknown;
  };

  const nome = typeof data.nome === "string" ? data.nome.trim() : "";
  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const disciplina =
    typeof data.disciplina === "string" ? data.disciplina.trim() : "";
  const telefone =
    typeof data.telefone === "string" ? data.telefone.trim() : "";
  const inputAvatarUrl =
    typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : "";

  if (!nome) {
    throw new HttpsError("invalid-argument", "Nome é obrigatório.");
  }

  if (!email || !isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "E-mail inválido.");
  }

  let userRecord;
  let alreadyExists = false;

  try {
    userRecord = await auth.getUserByEmail(email);
    alreadyExists = true;
  } catch (error) {
    const authError = error as {code?: string};
    if (authError.code !== "auth/user-not-found") {
      throw new HttpsError("internal", "Falha ao validar usuário no Auth.");
    }

    const temporaryPassword = `${randomUUID()}Aa1!`;
    userRecord = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: nome,
    });
  }

  const userRef = db.collection("users").doc(userRecord.uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const existingRole = userSnap.data()?.role;
    if (existingRole && existingRole !== "teacher") {
      throw new HttpsError(
        "failed-precondition",
        "Já existe uma conta com este e-mail em outro perfil."
      );
    }
  }

  const existingAvatar = userSnap.exists ? userSnap.data()?.avatarUrl : null;
  let avatarUrl = buildAvatarUrl(nome || getNameFromEmail(email));
  if (inputAvatarUrl) {
    avatarUrl = inputAvatarUrl;
  }
  if (typeof existingAvatar === "string" && existingAvatar.trim()) {
    avatarUrl = existingAvatar;
  }
  if (inputAvatarUrl) {
    avatarUrl = inputAvatarUrl;
  }

  const baseTeacherUser = {
    uid: userRecord.uid,
    email,
    role: "teacher",
    nome,
    disciplina: disciplina || null,
    telefone: telefone || null,
    status: "ativo",
    avatarUrl,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!userSnap.exists) {
    await userRef.set({
      ...baseTeacherUser,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await userRef.set(baseTeacherUser, {merge: true});
  }

  return {
    uid: userRecord.uid,
    email,
    alreadyExists,
  };
});

/**
 * Cria conta de responsável via admin e prepara perfil no Firestore.
 * Apenas usuários com role admin podem executar.
 */
export const createParentAccount = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const db = getFirestore();
  const auth = getAuth();

  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;

  if (callerRole !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem cadastrar responsáveis."
    );
  }

  const data = (request.data || {}) as {
    nome?: unknown;
    email?: unknown;
    telefone?: unknown;
    avatarUrl?: unknown;
  };

  const nome = typeof data.nome === "string" ? data.nome.trim() : "";
  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const telefone =
    typeof data.telefone === "string" ? data.telefone.trim() : "";
  const inputAvatarUrl =
    typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : "";

  if (!nome) {
    throw new HttpsError("invalid-argument", "Nome é obrigatório.");
  }

  if (!email || !isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "E-mail inválido.");
  }

  let userRecord;
  let alreadyExists = false;

  try {
    userRecord = await auth.getUserByEmail(email);
    alreadyExists = true;
  } catch (error) {
    const authError = error as {code?: string};
    if (authError.code !== "auth/user-not-found") {
      throw new HttpsError("internal", "Falha ao validar usuário no Auth.");
    }

    const temporaryPassword = `${randomUUID()}Aa1!`;
    userRecord = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: nome,
    });
  }

  const userRef = db.collection("users").doc(userRecord.uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const existingRole = userSnap.data()?.role;
    if (existingRole && existingRole !== "parent") {
      throw new HttpsError(
        "failed-precondition",
        "Já existe uma conta com este e-mail em outro perfil."
      );
    }
  }

  const existingAvatar = userSnap.exists ? userSnap.data()?.avatarUrl : null;
  let avatarUrl = buildAvatarUrl(nome || getNameFromEmail(email));
  if (inputAvatarUrl) {
    avatarUrl = inputAvatarUrl;
  }
  if (typeof existingAvatar === "string" && existingAvatar.trim()) {
    avatarUrl = existingAvatar;
  }
  if (inputAvatarUrl) {
    avatarUrl = inputAvatarUrl;
  }

  const baseParentUser = {
    uid: userRecord.uid,
    email,
    role: "parent",
    nome,
    telefone: telefone || null,
    status: "ativo",
    avatarUrl,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!userSnap.exists) {
    await userRef.set({
      ...baseParentUser,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await userRef.set(baseParentUser, {merge: true});
  }

  return {
    uid: userRecord.uid,
    email,
    alreadyExists,
  };
});

/**
 * Preenche avatar padrão para usuários que ainda não possuem avatarUrl.
 * Apenas administradores podem executar.
 */
export const backfillUserAvatars = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const db = getFirestore();
  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;

  if (callerRole !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem executar este ajuste."
    );
  }

  const snapshots = await db.collection("users").get();
  let updatedCount = 0;

  for (const userDoc of snapshots.docs) {
    const data = userDoc.data();
    const avatar = typeof data.avatarUrl === "string" ? data.avatarUrl : "";
    if (avatar.trim()) {
      continue;
    }

    let rawName = getNameFromEmail(
      typeof data.email === "string" ? data.email : ""
    );
    if (typeof data.nome === "string" && data.nome.trim()) {
      rawName = data.nome.trim();
    }
    const avatarUrl = buildAvatarUrl(rawName);

    await userDoc.ref.set(
      {
        avatarUrl,
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    updatedCount += 1;
  }

  return {
    totalUsers: snapshots.size,
    updatedCount,
  };
});
