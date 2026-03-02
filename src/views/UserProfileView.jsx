import React, { useEffect, useState } from 'react';
import { maskTelefone } from '../utils/masks';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

async function loadFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

export default function UserProfileView() {
  const { currentUser, userProfile } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mensagemPerfil, setMensagemPerfil] = useState('');
  const [erroPerfil, setErroPerfil] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  useEffect(() => {
    setNome(userProfile?.nome || '');
    setTelefone(maskTelefone(userProfile?.telefone || ''));
    setAvatarUrl(userProfile?.avatarUrl || '');
  }, [userProfile]);

  const handleSelecionarAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await loadFileAsDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (error) {
      setErroPerfil(error?.message || 'Não foi possível carregar a imagem.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSalvarPerfil = async (event) => {
    event.preventDefault();

    if (!currentUser || !db) return;

    setMensagemPerfil('');
    setErroPerfil('');
    setSalvandoPerfil(true);

    try {
      // Inclui uid e role para satisfazer as regras do Firestore tanto em create quanto em update.
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        role: userProfile?.role || 'parent',
        email: userProfile?.email ?? null,
        authEmail: userProfile?.authEmail ?? null,
        username: userProfile?.username || '',
        nome: nome.trim(),
        telefone: telefone.trim(),
        avatarUrl: avatarUrl || null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMensagemPerfil('Perfil atualizado com sucesso.');
    } catch (error) {
      setErroPerfil(error?.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleAlterarSenha = async (event) => {
    event.preventDefault();

    if (!currentUser?.email || !auth?.currentUser) return;

    setMensagemSenha('');
    setErroSenha('');

    if (!senhaAtual.trim()) {
      setErroSenha('Informe sua senha atual.');
      return;
    }

    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha('A confirmação da senha não confere.');
      return;
    }

    setSalvandoSenha(true);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, senhaAtual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, novaSenha);

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMensagemSenha('Senha atualizada com sucesso.');
    } catch (error) {
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setErroSenha('Senha atual inválida.');
      } else {
        setErroSenha(error?.message || 'Não foi possível alterar a senha.');
      }
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Meu Perfil</h2>
        <p className="text-sm text-slate-500 mt-1">Atualize suas informações e sua senha de acesso.</p>
      </div>

      <form onSubmit={handleSalvarPerfil} className="glass-panel p-5 border border-slate-200/60 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">Dados pessoais</h3>

        {erroPerfil && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erroPerfil}</div>}
        {mensagemPerfil && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mensagemPerfil}</div>}

        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar do usuário" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Sem avatar</div>
            )}
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-600">Avatar</label>
            <input type="file" accept="image/*" onChange={handleSelecionarAvatar} className="form-control !py-2 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nome
            <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome" className="form-control !py-2.5" required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            E-mail
            <input value={userProfile?.email || currentUser?.email || ''} disabled className="form-control !py-2.5 bg-slate-100 text-slate-500" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
            Telefone
            <input value={telefone} onChange={(event) => setTelefone(maskTelefone(event.target.value))} placeholder="(XX) XXXXX-XXXX" className="form-control !py-2.5" />
          </label>
        </div>

        <button type="submit" disabled={salvandoPerfil} className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end disabled:opacity-60">
          Salvar perfil
        </button>
      </form>

      <form onSubmit={handleAlterarSenha} className="glass-panel p-5 border border-slate-200/60 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">Alterar senha</h3>

        {erroSenha && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erroSenha}</div>}
        {mensagemSenha && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mensagemSenha}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Senha atual
            <input type="password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} placeholder="Senha atual" className="form-control !py-2.5" required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nova senha
            <input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} placeholder="Nova senha" className="form-control !py-2.5" required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Confirmar nova senha
            <input type="password" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} placeholder="Confirmar nova senha" className="form-control !py-2.5" required />
          </label>
        </div>

        <button type="submit" disabled={salvandoSenha} className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end disabled:opacity-60">
          Alterar senha
        </button>
      </form>
    </div>
  );
}
