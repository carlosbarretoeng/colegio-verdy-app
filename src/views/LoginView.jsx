import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus, AlertCircle, Phone, Mail } from 'lucide-react';
import { maskTelefone } from '../utils/masks';
import { useAuth } from '../contexts/AuthContext';

const LoginView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [telefone, setTelefone] = useState('');
    const [username, setUsername] = useState('');
    const [emailCadastro, setEmailCadastro] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register, authError } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            if (isLogin) {
                await login(identifier, password);
            } else {
                if (password !== confirmPassword) {
                    setError('A confirmação da senha não confere.');
                    return;
                }

                await register({
                    nome: nomeCompleto,
                    telefone,
                    username,
                    email: emailCadastro,
                    password
                });
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Usuário ou senha inválidos. Verifique seus dados de acesso.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está cadastrado no sistema.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Informe um e-mail válido ou deixe o campo em branco.');
            } else if (err.code === 'auth/invalid-username') {
                setError('Usuário inválido. Use ao menos 3 caracteres (letras, números e ponto).');
            } else if (err.code === 'auth/username-already-in-use') {
                setError('Este nome de usuário já está em uso.');
            } else if (err.code === 'auth/invalid-display-name') {
                setError('Informe o nome completo.');
            } else if (err.code === 'auth/username-not-linked') {
                setError(err.message);
            } else if (err.code === 'auth/configuration-not-found') {
                setError(err.message || 'Firebase não configurado para autenticação.');
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
                    <img src="/pwa-192x192.png" alt="Colégio Verdy" className="w-20 h-20 mx-auto rounded-2xl shadow-lg mb-4 object-cover" />
                    <h1 className="text-3xl font-bold text-slate-800">Colégio Verdy</h1>
                    <p className="text-slate-500 mt-2">{isLogin ? 'Acesse o portal da escola' : 'Crie seu acesso inicial'}</p>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">

                    {authError && (
                        <div className="bg-amber-50 text-amber-700 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <span>{authError}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {isLogin ? (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário ou E-mail</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={e => setIdentifier(e.target.value)}
                                            placeholder="Seu usuário de acesso"
                                            className="w-full form-control !pl-10 !py-3"
                                            required
                                            autoComplete="username"
                                        />
                                        <User className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
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
                                            autoComplete="current-password"
                                        />
                                        <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={nomeCompleto}
                                            onChange={e => setNomeCompleto(e.target.value)}
                                            placeholder="Seu nome completo"
                                            className="w-full form-control !pl-10 !py-3"
                                            required
                                            autoComplete="name"
                                        />
                                        <User className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Telefone</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={telefone}
                                            onChange={e => setTelefone(maskTelefone(e.target.value))}
                                            placeholder="(XX) XXXXX-XXXX"
                                            className="w-full form-control !pl-10 !py-3"
                                            required
                                            autoComplete="tel"
                                        />
                                        <Phone className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="seu.usuario"
                                            className="w-full form-control !pl-10 !py-3"
                                            required
                                            autoComplete="username"
                                        />
                                        <User className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail (opcional)</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={emailCadastro}
                                            onChange={e => setEmailCadastro(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full form-control !pl-10 !py-3"
                                            autoComplete="email"
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
                                            autoComplete="new-password"
                                        />
                                        <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmação de Senha</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full form-control !pl-10 !py-3"
                                            required
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                        <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>
                            </>
                        )}

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
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setPassword('');
                                    setConfirmPassword('');
                                }}
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
