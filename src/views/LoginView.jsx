import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('E-mail ou senha inválidos. Verifique se você já tem cadastro.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está cadastrado no sistema.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Ocorreu um erro ao comunicar com o servidor!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-3xl shadow-[0_4px_10px_rgba(16,185,129,0.3)] mb-4">V</div>
                    <h1 className="text-3xl font-bold text-slate-800">Colégio Verdy</h1>
                    <p className="text-slate-500 mt-2">{isLogin ? 'Acesse o portal da escola' : 'Crie seu acesso inicial'}</p>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Seu email de acesso"
                                    className="w-full form-control !pl-10 !py-3"
                                    required
                                />
                                <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full form-control !pl-10 !py-3"
                                    required
                                    minLength={6}
                                />
                                <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn-primary w-full justify-center !py-3.5 mt-2 text-base ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Processando...' : (isLogin ? 'Entrar no Sistema' : 'Criar Cadastro')}
                            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-100 pt-6">
                        <p>
                            {isLogin ? "Primeiro acesso? " : "Já possui uma conta? "}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                className="font-bold text-primary hover:text-primary-dark transition-colors"
                                type="button"
                            >
                                {isLogin ? "Cadastre-se aqui" : "Faça Login"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
