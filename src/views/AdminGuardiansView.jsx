import React, { useEffect, useMemo, useState } from 'react';
import { maskTelefone } from '../utils/masks';
import { Filter, Pencil, Plus, ShieldCheck, ShieldMinus, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { app, auth, db, functions } from '../config/firebase';

const ITEMS_PER_PAGE = 5;
const EMPTY_FORM = { nome: '', email: '', telefone: '', avatarUrl: '' };

async function loadFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

async function optimizeImageDataUrl(dataUrl) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao processar imagem.'));
    img.src = dataUrl;
  });

  const maxSize = 512;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function AdminGuardiansView() {
  const [responsaveis, setResponsaveis] = useState([]);

  const [mostrarFormResponsavel, setMostrarFormResponsavel] = useState(false);
  const [responsavelEmEdicaoId, setResponsavelEmEdicaoId] = useState(null);
  const [formResponsavel, setFormResponsavel] = useState(EMPTY_FORM);

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [salvandoResponsavel, setSalvandoResponsavel] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState({ tipo: '', mensagem: '' });

  useEffect(() => {
    if (!db) {
      setCarregando(false);
      setFeedback({ tipo: 'erro', mensagem: 'Banco de dados não configurado.' });
      return () => { };
    }

    const parentsQuery = query(collection(db, 'users'), where('role', '==', 'parent'));
    const unsubscribe = onSnapshot(parentsQuery, (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nome: data.nome || 'Sem nome',
          email: data.email || '',
          telefone: data.telefone || '',
          avatarUrl: data.avatarUrl || '',
          status: data.status || 'ativo'
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setResponsaveis(lista.map((item) => ({ ...item, nomeRaw: item.nome === 'Sem nome' ? '' : item.nome })));
      setCarregando(false);
    }, (error) => {
      setCarregando(false);
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar os responsáveis do banco.' });
    });

    return unsubscribe;
  }, []);

  const filtrados = useMemo(() => responsaveis.filter((responsavel) => {
    const nomeValido = responsavel.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const statusValido = filtroStatus === 'todos' ? true : responsavel.status === filtroStatus;
    return nomeValido && statusValido;
  }), [responsaveis, filtroNome, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaSegura - 1) * ITEMS_PER_PAGE, paginaSegura * ITEMS_PER_PAGE);

  const abrirNovoResponsavel = () => {
    setResponsavelEmEdicaoId(null);
    setFormResponsavel(EMPTY_FORM);
    setMostrarFormResponsavel(true);
  };

  const abrirEditarResponsavel = (responsavel) => {
    setResponsavelEmEdicaoId(responsavel.id);
    setFormResponsavel({
      nome: responsavel.nomeRaw ?? responsavel.nome,
      email: responsavel.email || '',
      telefone: maskTelefone(responsavel.telefone || ''),
      avatarUrl: responsavel.avatarUrl || ''
    });
    setMostrarFormResponsavel(true);
  };

  const fecharFormResponsavel = () => {
    setResponsavelEmEdicaoId(null);
    setFormResponsavel(EMPTY_FORM);
    setMostrarFormResponsavel(false);
  };

  const handleSalvarResponsavel = (event) => {
    event.preventDefault();

    const salvar = async () => {
      setFeedback({ tipo: '', mensagem: '' });
      setSalvandoResponsavel(true);

      const nome = formResponsavel.nome.trim();
      const email = formResponsavel.email.trim().toLowerCase();
      const telefone = formResponsavel.telefone.trim();
      const avatarUrl = formResponsavel.avatarUrl.trim();
      if (!nome) {
        setSalvandoResponsavel(false);
        return;
      }
      if (!responsavelEmEdicaoId && !email) {
        setSalvandoResponsavel(false);
        return;
      }

      try {
        if (!responsavelEmEdicaoId) {
          if (!app || !auth) throw new Error('Firebase não configurado para cadastro de responsável.');

          const createParentAccount = httpsCallable(functions, 'createParentAccount');
          const result = await createParentAccount({ nome, email, telefone, avatarUrl });
          const responsavelEmail = result?.data?.email || email;

          await sendPasswordResetEmail(auth, responsavelEmail);
          setFeedback({ tipo: 'sucesso', mensagem: 'Responsável cadastrado e link para criação de senha enviado por e-mail.' });
        } else {
          if (!db) throw new Error('Banco de dados não configurado.');

          await updateDoc(doc(db, 'users', responsavelEmEdicaoId), {
            nome,
            telefone: telefone || null,
            avatarUrl: avatarUrl || null,
            updatedAt: serverTimestamp()
          });

          setFeedback({ tipo: 'sucesso', mensagem: 'Dados do responsável atualizados com sucesso.' });
        }

        setPagina(1);
        fecharFormResponsavel();
      } catch (error) {
        const mensagem = error?.message || 'Não foi possível salvar o responsável.';
        setFeedback({ tipo: 'erro', mensagem });
      } finally {
        setSalvandoResponsavel(false);
      }
    };

    salvar();
  };

  const handleToggleStatusResponsavel = (responsavelId) => {
    const atualizar = async () => {
      if (!db) throw new Error('Banco de dados não configurado.');
      const responsavelAtual = responsaveis.find((item) => item.id === responsavelId);
      if (!responsavelAtual) return;

      await updateDoc(doc(db, 'users', responsavelId), {
        status: responsavelAtual.status === 'ativo' ? 'inativo' : 'ativo',
        updatedAt: serverTimestamp()
      });
    };

    atualizar().catch((error) => {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível atualizar o status do responsável.' });
    });
  };

  const handleSelecionarAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await loadFileAsDataUrl(file);
      const optimized = await optimizeImageDataUrl(dataUrl);
      setFormResponsavel((prev) => ({ ...prev, avatarUrl: optimized }));
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar o avatar.' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Responsáveis</h2>
        <p className="text-sm text-slate-500 mt-1">Cadastro e acompanhamento dos responsáveis dos alunos.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Responsáveis</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltrosMobile((prev) => !prev)}
              className={`md:hidden h-9 w-9 rounded-lg border transition-colors inline-flex items-center justify-center ${mostrarFiltrosMobile ? 'bg-primary text-white border-primary' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
              aria-label="Filtros"
            >
              <Filter size={16} />
            </button>
            <button
              onClick={mostrarFormResponsavel ? fecharFormResponsavel : abrirNovoResponsavel}
              className="md:hidden h-9 w-9 rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors inline-flex items-center justify-center"
              aria-label="Adicionar responsável"
            >
              {mostrarFormResponsavel ? <X size={16} /> : <Plus size={16} />}
            </button>
            <button onClick={mostrarFormResponsavel ? fecharFormResponsavel : abrirNovoResponsavel} className="hidden md:inline-flex h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors items-center">
              {mostrarFormResponsavel ? 'Cancelar' : 'Adicionar responsável'}
            </button>
          </div>
        </div>

        {mostrarFormResponsavel && (
          <form onSubmit={handleSalvarResponsavel} className="mb-5 rounded-xl border border-slate-200 p-4 bg-white/80 flex flex-col gap-3">
            <div className='grid grid-cols-1 md:grid-cols-8 gap-3 items-center'>
              <div className='col-span-3'>
                <div className="grid grid-cols-1 gap-3 items-center">
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Upload de avatar
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 '>
                      <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                        {formResponsavel.avatarUrl ? (
                          <img src={formResponsavel.avatarUrl} alt="Avatar do responsável" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sem avatar</div>
                        )}
                      </div>
                    </div>
                    <input type="file" accept="image/*" onChange={handleSelecionarAvatar} className="form-control !py-2" />
                  </label>
                </div>
              </div>

              <div className='col-span-5'>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col md:col-span-2 gap-1 text-sm text-slate-600">
                    Nome completo
                    <input value={formResponsavel.nome} onChange={(event) => setFormResponsavel((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome completo" className="form-control !py-2.5" required />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2 text-sm text-slate-600">
                    E-mail
                    <input type="email" value={formResponsavel.email} onChange={(event) => setFormResponsavel((prev) => ({ ...prev, email: event.target.value }))} placeholder="E-mail" className="form-control !py-2.5" required disabled={Boolean(responsavelEmEdicaoId)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Telefone
                    <input value={formResponsavel.telefone} onChange={(event) => setFormResponsavel((prev) => ({ ...prev, telefone: maskTelefone(event.target.value) }))} placeholder="(XX) XXXXX-XXXX" className="form-control !py-2.5" />
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" disabled={salvandoResponsavel} className="h-10 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end disabled:opacity-60">
              {responsavelEmEdicaoId ? 'Salvar edição' : 'Salvar responsável'}
            </button>
          </form>
        )}

        {feedback.mensagem && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {feedback.mensagem}
          </div>
        )}

        <div className={`${mostrarFiltrosMobile ? 'flex' : 'hidden'} flex-col md:flex md:flex-row gap-3 mb-4`}>
          <input value={filtroNome} onChange={(e) => { setFiltroNome(e.target.value); setPagina(1); }} placeholder="Buscar por nome" className="form-control !py-2.5" />
          <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }} className="form-control !py-2.5">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        {carregando && <div className="py-6 text-sm text-slate-500">Carregando responsáveis...</div>}

        {!carregando && paginados.map((responsavel) => (
          <div key={responsavel.id} className={`mb-2 rounded-lg bg-slate-100 border border-slate-200 shadow-md text-slate-700 ${responsavel.status === 'ativo' ? 'border-l-8 border-l-emerald-500' : 'border-l-8 border-l-red-500'}`}>
            <div className="flex gap-3 md:items-center md:gap-3">
              <div className="flex hidden md:flex items-center gap-2 flex-wrap col-span-2 p-2">
                <button onClick={() => abrirEditarResponsavel(responsavel)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                  <Pencil />
                  Editar
                </button>
                <button onClick={() => handleToggleStatusResponsavel(responsavel.id)} className={`w-16 px-2 rounded-md p-1 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${responsavel.status === 'ativo' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-700'}`}>
                  {responsavel.status === 'ativo' ? <ShieldMinus /> : <ShieldCheck />}
                  {responsavel.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </button>
              </div>

              <div className="md:grow min-w-0 md:col-span-6 gap-3 my-3">
                <div className="ps-2 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    {responsavel.avatarUrl ? (
                      <img src={responsavel.avatarUrl} alt={responsavel.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Sem</div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 truncate">{responsavel.nome}</div>
                    <div className="text-sm text-slate-500 truncate">{responsavel.email}</div>
                    <div className="md:hidden text-sm text-slate-500 truncate">{responsavel.telefone || 'Sem telefone'}</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 md:w-[300px] hidden md:flex">
                <div className="text-sm text-slate-500 truncate">{responsavel.telefone || 'Sem telefone'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:hidden p-1">
              <button onClick={() => abrirEditarResponsavel(responsavel)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                <Pencil />
              </button>
              <button onClick={() => handleToggleStatusResponsavel(responsavel.id)} className={`h-8 px-2 rounded-e-lg text-xs font-medium border border-primary border-l-0 inline-flex justify-center items-center gap-1 ${responsavel.status === 'ativo' ? 'text-red-600' : 'text-emerald-700'}`}>
                {responsavel.status === 'ativo' ? <ShieldMinus /> : <ShieldCheck />}
              </button>
            </div>
          </div>
        ))}

        {!carregando && paginados.length === 0 && (
          <div className="py-6 text-sm text-slate-500">Nenhum responsável encontrado.</div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Página {paginaSegura} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button disabled={paginaSegura === 1} onClick={() => setPagina((prev) => Math.max(1, prev - 1))} className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40">Anterior</button>
            <button disabled={paginaSegura === totalPaginas} onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))} className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
