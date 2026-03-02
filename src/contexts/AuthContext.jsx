import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, firebaseConfigError } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const VALID_ROLES = new Set(['teacher', 'parent', 'admin']);

const getNameFromEmail = (email) => {
    const localPart = (email || '').split('@')[0] || 'Usuario';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    return normalized || 'Usuario';
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

const normalizeUsername = (value) => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');

const buildAuthEmailFromUsername = (username) => `${username}@usuario.verdy.app`;

const isGeneratedAuthEmail = (email) => /@usuario\.verdy\.app$/i.test(email || '');

const buildAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Usuario')}&background=e2e8f0&color=0f172a`;

/** Tenta executar fn até maxAttempts vezes com delay entre tentativas. */
async function withRetry(fn, maxAttempts = 3, delayMs = 300) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }
    throw lastError;
}

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'teacher', 'parent', 'admin'
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    // Guarda os dados do formulário de registro para evitar condição de corrida
    // onde onAuthStateChanged dispara antes da transação e sobrescreve o nome/telefone
    const pendingRegistrationRef = useRef(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return () => { };
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const role = data.role;
                        const storedEmail = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null;
                        const authEmail = user.email || null;
                        const visibleEmail = storedEmail || (isGeneratedAuthEmail(authEmail || '') ? null : authEmail);
                        const nomeBase = data.nome || getNameFromEmail(visibleEmail || authEmail || '');
                        const profileData = {
                            uid: user.uid,
                            email: visibleEmail,
                            authEmail: authEmail,
                            username: data.username || '',
                            role: VALID_ROLES.has(role) ? role : 'parent',
                            nome: nomeBase,
                            telefone: data.telefone || '',
                            disciplina: data.disciplina || '',
                            avatarUrl: data.avatarUrl || buildAvatarUrl(nomeBase)
                        };

                        if (!data.avatarUrl) {
                            await setDoc(userRef, {
                                avatarUrl: profileData.avatarUrl,
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }

                        // Reparo silencioso: se o doc usernames estiver ausente, recria.
                        if (data.username) {
                            try {
                                const usernameRef = doc(db, 'usernames', data.username);
                                const usernameSnap = await getDoc(usernameRef);
                                if (!usernameSnap.exists()) {
                                    const authEmailForUsername = data.authEmail || user.email;
                                    if (authEmailForUsername) {
                                        await setDoc(usernameRef, { email: authEmailForUsername, uid: user.uid });
                                        console.debug('[auth] doc usernames reparado:', data.username);
                                    }
                                }
                            } catch (repairErr) {
                                console.warn('[auth] reparo do doc usernames falhou:', repairErr);
                            }
                        }

                        setUserProfile(profileData);
                        setUserRole(VALID_ROLES.has(role) ? role : 'parent');
                    } else {
                        const authEmail = user.email || null;
                        const visibleEmail = isGeneratedAuthEmail(authEmail || '') ? null : authEmail;
                        // Usa dados do formulário de registro se disponíveis, caso contrário
                        // deriva do email. NUNCA escreve no Firestore aqui — o register() é
                        // o único responsável por criar o documento do usuário.
                        const pending = pendingRegistrationRef.current;
                        const nomeBase = pending?.nome || getNameFromEmail(visibleEmail || authEmail || '');
                        const profileData = {
                            uid: user.uid,
                            email: pending?.emailInformado ?? visibleEmail,
                            authEmail,
                            username: pending?.username || '',
                            role: 'parent',
                            nome: nomeBase,
                            telefone: pending?.telefone || '',
                            disciplina: '',
                            avatarUrl: buildAvatarUrl(nomeBase)
                        };

                        setUserProfile(profileData);
                        setUserRole('parent');
                    }
                } catch (e) {
                    console.log("Erro ao buscar role, backend não configurado ok. " + e);
                    setUserProfile({
                        uid: user.uid,
                        email: isGeneratedAuthEmail(user.email || '') ? null : (user.email || null),
                        authEmail: user.email || null,
                        username: '',
                        role: 'parent',
                        nome: getNameFromEmail(user.email || ''),
                        telefone: '',
                        disciplina: '',
                        avatarUrl: buildAvatarUrl(getNameFromEmail(user.email || ''))
                    });
                    setUserRole('parent');
                }
            } else {
                setUserProfile(null);
                setUserRole(null);
            }
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (identifier, password) => {
        if (!auth) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });

        // Após login bem-sucedido, garante que o doc usernames existe (reparo silencioso).
        const repairUsernameDoc = async (cred) => {
            try {
                const userDocSnap = await getDoc(doc(db, 'users', cred.user.uid));
                if (!userDocSnap.exists()) return;
                const data = userDocSnap.data();
                if (!data.username) return;
                const usernameRef = doc(db, 'usernames', data.username);
                const usernameSnap = await getDoc(usernameRef);
                if (!usernameSnap.exists()) {
                    const authEmailForUsername = data.authEmail || cred.user.email;
                    if (authEmailForUsername) {
                        await setDoc(usernameRef, { email: authEmailForUsername, uid: cred.user.uid });
                    }
                }
            } catch (e) {
                console.warn('[login] reparo do doc usernames falhou:', e);
            }
        };

        // Login direto por email — repara o doc usernames em seguida.
        if (identifier.includes('@')) {
            const cred = await signInWithEmailAndPassword(auth, identifier, password);
            await repairUsernameDoc(cred);
            return cred;
        }

        // Login por username: descobre o authEmail a partir do doc de usernames.
        const normalizedId = normalizeUsername(identifier);
        const usernameSnap = await getDoc(doc(db, 'usernames', normalizedId));

        if (!usernameSnap.exists()) {
            throw { code: 'auth/username-not-linked', message: 'Usuário não encontrado. Tente fazer login com seu e-mail.' };
        }

        const resolvedEmail = usernameSnap.data().email;
        return signInWithEmailAndPassword(auth, resolvedEmail, password);
    };

    const register = async (payloadOrEmail, passwordArg) => {
        if (!auth) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });
        if (!db) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });

        const payload = typeof payloadOrEmail === 'object' && payloadOrEmail !== null
            ? payloadOrEmail
            : {
                nome: getNameFromEmail(payloadOrEmail || ''),
                telefone: '',
                username: (payloadOrEmail || '').split('@')[0] || '',
                email: payloadOrEmail || '',
                password: passwordArg || ''
            };

        const nome = typeof payload.nome === 'string' ? payload.nome.trim() : '';
        const telefone = typeof payload.telefone === 'string' ? payload.telefone.trim() : '';
        const normalizedUsername = normalizeUsername(payload.username);
        const emailInformado = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
        const password = typeof payload.password === 'string' ? payload.password : '';

        if (!nome) {
            throw { code: 'auth/invalid-display-name', message: 'Nome completo é obrigatório.' };
        }

        if (!normalizedUsername || normalizedUsername.length < 3) {
            throw { code: 'auth/invalid-username', message: 'Usuário inválido. Use ao menos 3 caracteres.' };
        }

        if (!password || password.length < 6) {
            throw { code: 'auth/weak-password', message: 'A senha deve ter pelo menos 6 caracteres.' };
        }

        if (emailInformado && !isValidEmail(emailInformado)) {
            throw { code: 'auth/invalid-email', message: 'E-mail inválido.' };
        }

        const authEmail = (emailInformado || buildAuthEmailFromUsername(normalizedUsername)).toLowerCase();
        const usernameRef = doc(db, 'usernames', normalizedUsername);

        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
            throw { code: 'auth/username-already-in-use', message: 'Este usuário já está em uso.' };
        }

        const nomeBase = nome || getNameFromEmail(emailInformado || authEmail);
        const avatarUrl = buildAvatarUrl(nomeBase);
        const userDocData = {
            uid: '',           // preenchido abaixo
            email: emailInformado || null,
            authEmail,
            username: normalizedUsername,
            role: 'parent',
            nome: nomeBase,
            telefone,
            avatarUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Grava os dados do formulário antes de criar o usuário no Auth para que
        // onAuthStateChanged use estes dados caso dispare antes das escritas no Firestore.
        pendingRegistrationRef.current = { nome: nomeBase, telefone, username: normalizedUsername, emailInformado: emailInformado || null };

        let credential;
        try {
            credential = await createUserWithEmailAndPassword(auth, authEmail, password);
            // Aguarda o token para garantir que o Firestore aceitará as escritas imediatas.
            await credential.user.getIdToken();
            // Pequena espera para o Firestore propagar a sessão de auth.
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            pendingRegistrationRef.current = null;
            throw err;
        }

        try {
            // Escreve o documento principal do usuário. Se falhar, reverte o Auth.
            await setDoc(doc(db, 'users', credential.user.uid), {
                ...userDocData,
                uid: credential.user.uid
            });
        } catch (error) {
            pendingRegistrationRef.current = null;
            try { await deleteUser(credential.user); } catch (e) { /* ignore */ }
            throw error;
        }

        try {
            // Escreve o documento de username com retry — o token JWT pode ainda não
            // estar totalmente propagado ao Firestore logo após createUser.
            await withRetry(async () => {
                const usernameSnap2 = await getDoc(usernameRef);
                if (usernameSnap2.exists()) {
                    if (usernameSnap2.data()?.uid !== credential.user.uid) {
                        throw new Error('USERNAME_IN_USE');
                    }
                    return; // já existe para este uid
                }
                await setDoc(usernameRef, { email: authEmail, uid: credential.user.uid });
                console.debug('[register] doc usernames criado:', normalizedUsername, '->', authEmail);
            });
        } catch (error) {
            pendingRegistrationRef.current = null;
            if (error?.message === 'USERNAME_IN_USE') {
                throw { code: 'auth/username-already-in-use', message: 'Este usuário já está em uso.' };
            }
            console.error('[register] Falha ao salvar doc usernames após retries:', error);
        }

        // Limpa o ref e define o estado React com os dados definitivos do cadastro.
        pendingRegistrationRef.current = null;
        setUserProfile({
            uid: credential.user.uid,
            email: emailInformado || null,
            authEmail,
            username: normalizedUsername,
            role: 'parent',
            nome: nomeBase,
            telefone,
            disciplina: '',
            avatarUrl
        });
        setUserRole('parent');

        return credential;
    };

    const logout = () => {
        if (!auth) return Promise.resolve();
        return signOut(auth);
    };

    const value = {
        currentUser,
        userRole,
        userProfile,
        login,
        register,
        logout,
        authError: firebaseConfigError
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
