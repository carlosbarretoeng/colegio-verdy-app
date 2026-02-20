import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, firebaseConfigError } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const VALID_ROLES = new Set(['teacher', 'parent', 'admin']);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'teacher', 'parent', 'admin'
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
                        const role = userDoc.data().role;
                        setUserRole(VALID_ROLES.has(role) ? role : 'parent');
                    } else {
                        await setDoc(userRef, {
                            uid: user.uid,
                            email: user.email ?? null,
                            role: 'parent',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                        setUserRole('parent');
                    }
                } catch (e) {
                    console.log("Erro ao buscar role, backend não configurado ok. " + e);
                    setUserRole('parent');
                }
            } else {
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
        await setDoc(doc(db, 'users', credential.user.uid), {
            uid: credential.user.uid,
            email: credential.user.email ?? email,
            role: 'parent',
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
