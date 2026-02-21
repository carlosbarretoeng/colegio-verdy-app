import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, firebaseConfigError } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const VALID_ROLES = new Set(['teacher', 'parent', 'admin']);

const getNameFromEmail = (email) => {
    const localPart = (email || '').split('@')[0] || 'Usuario';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    return normalized || 'Usuario';
};

const buildAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Usuario')}&background=e2e8f0&color=0f172a`;

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'teacher', 'parent', 'admin'
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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
                        const nomeBase = data.nome || getNameFromEmail(user.email || data.email || '');
                        const profileData = {
                            uid: user.uid,
                            email: data.email || user.email || null,
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

                        setUserProfile(profileData);
                        setUserRole(VALID_ROLES.has(role) ? role : 'parent');
                    } else {
                        const nomeBase = getNameFromEmail(user.email || '');
                        const profileData = {
                            uid: user.uid,
                            email: user.email ?? null,
                            role: 'parent',
                            nome: nomeBase,
                            telefone: '',
                            disciplina: '',
                            avatarUrl: buildAvatarUrl(nomeBase)
                        };

                        await setDoc(userRef, {
                            ...profileData,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });

                        setUserProfile(profileData);
                        setUserRole('parent');
                    }
                } catch (e) {
                    console.log("Erro ao buscar role, backend não configurado ok. " + e);
                    setUserProfile({
                        uid: user.uid,
                        email: user.email || null,
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

    const login = (email, password) => {
        if (!auth) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email, password) => {
        if (!auth) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });
        if (!db) return Promise.reject({ code: 'auth/configuration-not-found', message: firebaseConfigError });

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const nomeBase = getNameFromEmail(credential.user.email ?? email);
        await setDoc(doc(db, 'users', credential.user.uid), {
            uid: credential.user.uid,
            email: credential.user.email ?? email,
            role: 'parent',
            nome: nomeBase,
            avatarUrl: buildAvatarUrl(nomeBase),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

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
