import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Pencil, Plus, ShieldCheck, ShieldMinus, Users, X } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ITEMS_PER_PAGE = 5;
const EMPTY_FORM = { nome: '', turmaId: '', fotoUrl: '' };

function createAvatarUrl(nome) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=e2e8f0&color=0f172a`;
}

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

export default function AdminStudentsView() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);

  const [mostrarFormAluno, setMostrarFormAluno] = useState(false);
  const [alunoEmEdicaoId, setAlunoEmEdicaoId] = useState(null);
  const [formAluno, setFormAluno] = useState(EMPTY_FORM);

  const [filtroAlunoNome, setFiltroAlunoNome] = useState('');
  const [filtroAlunoStatus, setFiltroAlunoStatus] = useState('todos');
  const [filtroAlunoTurma, setFiltroAlunoTurma] = useState('todas');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const [paginaAluno, setPaginaAluno] = useState(1);

  const [salvandoAluno, setSalvandoAluno] = useState(false);
  const [carregandoAlunos, setCarregandoAlunos] = useState(true);
  const [feedback, setFeedback] = useState({ tipo: '', mensagem: '' });

  useEffect(() => {
    if (!db) {
      setCarregandoAlunos(false);
      setFeedback({ tipo: 'erro', mensagem: 'Banco de dados não configurado.' });
      return () => { };
    }

    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nome: data.nome || 'Sem nome',
          turmaId: data.turmaId || '',
          status: data.status || 'ativo',
          fotoUrl: data.fotoUrl || ''
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setAlunos(lista);
      setCarregandoAlunos(false);
    }, (error) => {
      setCarregandoAlunos(false);
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar os alunos do banco.' });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) {
      return () => { };
    }

    const unsubscribe = onSnapshot(collection(db, 'classrooms'), (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nome: data.nome || 'Sem nome',
          periodo: data.periodo || '',
          status: data.status || 'ativa'
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setTurmas(lista);
    });

    return unsubscribe;
  }, []);

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      const nomeValido = aluno.nome.toLowerCase().includes(filtroAlunoNome.toLowerCase());
      const statusValido = filtroAlunoStatus === 'todos' ? true : aluno.status === filtroAlunoStatus;
      const turmaValida = filtroAlunoTurma === 'todas' ? true : aluno.turmaId === filtroAlunoTurma;
      return nomeValido && statusValido && turmaValida;
    });
  }, [alunos, filtroAlunoNome, filtroAlunoStatus, filtroAlunoTurma]);

  const totalPaginasAluno = Math.max(1, Math.ceil(alunosFiltrados.length / ITEMS_PER_PAGE));
  const paginaAlunoSegura = Math.min(paginaAluno, totalPaginasAluno);
  const alunosPaginados = alunosFiltrados.slice((paginaAlunoSegura - 1) * ITEMS_PER_PAGE, paginaAlunoSegura * ITEMS_PER_PAGE);

  const turmaNome = (turmaId) => turmas.find((turma) => turma.id === turmaId)?.nome || 'Sem turma';

  const abrirNovoAluno = () => {
    setAlunoEmEdicaoId(null);
    setFormAluno(EMPTY_FORM);
    setMostrarFormAluno(true);
  };

  const abrirEditarAluno = (aluno) => {
    setAlunoEmEdicaoId(aluno.id);
    setFormAluno({
      nome: aluno.nome,
      turmaId: aluno.turmaId || '',
      fotoUrl: aluno.fotoUrl || ''
    });
    setMostrarFormAluno(true);
  };

  const fecharFormAluno = () => {
    setMostrarFormAluno(false);
    setAlunoEmEdicaoId(null);
    setFormAluno(EMPTY_FORM);
  };

  const handleSelecionarFoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await loadFileAsDataUrl(file);
      const optimized = await optimizeImageDataUrl(dataUrl);
      setFormAluno((prev) => ({ ...prev, fotoUrl: optimized }));
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar a foto.' });
    } finally {
      event.target.value = '';
    }
  };

  const handleSalvarAluno = async (event) => {
    event.preventDefault();

    setFeedback({ tipo: '', mensagem: '' });
    setSalvandoAluno(true);

    const nome = formAluno.nome.trim();
    const turmaId = formAluno.turmaId;
    if (!nome || !turmaId) {
      setSalvandoAluno(false);
      return;
    }

    const fotoUrl = formAluno.fotoUrl.trim() || createAvatarUrl(nome);

    try {
      if (!db) throw new Error('Banco de dados não configurado.');

      if (!alunoEmEdicaoId) {
        await addDoc(collection(db, 'students'), {
          nome,
          turmaId,
          fotoUrl,
          status: 'ativo',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setFeedback({ tipo: 'sucesso', mensagem: 'Aluno cadastrado com sucesso.' });
      } else {
        await updateDoc(doc(db, 'students', alunoEmEdicaoId), {
          nome,
          turmaId,
          fotoUrl,
          updatedAt: serverTimestamp()
        });
        setFeedback({ tipo: 'sucesso', mensagem: 'Dados do aluno atualizados com sucesso.' });
      }

      setPaginaAluno(1);
      fecharFormAluno();
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível salvar o aluno.' });
    } finally {
      setSalvandoAluno(false);
    }
  };

  const handleToggleStatusAluno = (alunoId) => {
    const atualizar = async () => {
      if (!db) throw new Error('Banco de dados não configurado.');
      const alunoAtual = alunos.find((item) => item.id === alunoId);
      if (!alunoAtual) return;

      await updateDoc(doc(db, 'students', alunoId), {
        status: alunoAtual.status === 'ativo' ? 'inativo' : 'ativo',
        updatedAt: serverTimestamp()
      });
    };

    atualizar().catch((error) => {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível atualizar o status do aluno.' });
    });
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Alunos</h2>
        <p className="text-sm text-slate-500 mt-1">Cadastro, edição e status dos alunos.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Alunos</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltrosMobile((prev) => !prev)}
              className={`md:hidden h-9 w-9 rounded-lg border transition-colors inline-flex items-center justify-center ${mostrarFiltrosMobile ? 'bg-primary text-white border-primary' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
              aria-label="Filtros"
            >
              <Filter size={16} />
            </button>
            <button
              onClick={mostrarFormAluno ? fecharFormAluno : abrirNovoAluno}
              className="md:hidden h-9 w-9 rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors inline-flex items-center justify-center"
              aria-label="Adicionar aluno"
            >
              {mostrarFormAluno ? <X size={16} /> : <Plus size={16} />}
            </button>
            <button onClick={mostrarFormAluno ? fecharFormAluno : abrirNovoAluno} className="hidden md:inline-flex h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors items-center">
              {mostrarFormAluno ? 'Cancelar' : 'Adicionar aluno'}
            </button>
          </div>
        </div>

        {mostrarFormAluno && (
          <form onSubmit={handleSalvarAluno} className="mb-5 rounded-xl border border-slate-200 p-4 bg-white/80 flex flex-col gap-3">
            <div className='grid grid-cols-1 md:grid-cols-8 gap-3 items-center'>
              <div className='col-span-3'>
                <div className="grid grid-cols-1 gap-3 items-center">
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Upload da foto
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 '>
                      <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                        {formAluno.fotoUrl ? (
                          <img src={formAluno.fotoUrl} alt="Avatar do aluno" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sem foto</div>
                        )}
                      </div>
                    </div>
                    <input type="file" accept="image/*" onChange={handleSelecionarFoto} className="form-control !py-2" />
                  </label>
                </div>
              </div>

              <div className='col-span-5'>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col md:col-span-2 gap-1 text-sm text-slate-600">
                    Nome completo
                    <input value={formAluno.nome} onChange={(event) => setFormAluno((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome do aluno" className="form-control !py-2.5" required />
                  </label>
                  <label className="flex flex-col md:col-span-2 gap-1 text-sm text-slate-600">
                    Turma
                    <select value={formAluno.turmaId} onChange={(event) => setFormAluno((prev) => ({ ...prev, turmaId: event.target.value }))} className="form-control !py-2.5" required>
                      <option value="">Selecione a turma</option>
                      {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" disabled={salvandoAluno} className="h-10 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end disabled:opacity-60">
              {alunoEmEdicaoId ? 'Salvar edição' : 'Salvar aluno'}
            </button>
          </form>
        )}

        {feedback.mensagem && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {feedback.mensagem}
          </div>
        )}

        <div className={`${mostrarFiltrosMobile ? 'flex' : 'hidden'} flex-col gap-3 mb-4 md:flex md:flex-row`}>
          <input value={filtroAlunoNome} onChange={(event) => { setFiltroAlunoNome(event.target.value); setPaginaAluno(1); }} placeholder="Buscar por nome" className="form-control !py-2.5" />
          <select value={filtroAlunoStatus} onChange={(event) => { setFiltroAlunoStatus(event.target.value); setPaginaAluno(1); }} className="form-control !py-2.5">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          <select value={filtroAlunoTurma} onChange={(event) => { setFiltroAlunoTurma(event.target.value); setPaginaAluno(1); }} className="form-control !py-2.5">
            <option value="todas">Todas as turmas</option>
            {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
          </select>
        </div>

        {carregandoAlunos && <div className="py-6 text-sm text-slate-500">Carregando alunos...</div>}

        {!carregandoAlunos && alunosPaginados.map((aluno) => (
          <div key={aluno.id} className={`mb-2 rounded-lg bg-slate-100 border border-slate-200 shadow-md text-slate-700 ${aluno.status === 'ativo' ? 'border-l-8 border-l-emerald-500' : 'border-l-8 border-l-red-500'}`}>
            <div className="flex gap-3 md:items-center md:gap-3">
              <div className="flex hidden md:flex items-center gap-2 flex-wrap col-span-2 p-2">
                <button onClick={() => abrirEditarAluno(aluno)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                  <Pencil />
                  Editar
                </button>
                <button onClick={() => console.log(turma.id)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-primary bg-primary/15 border border-primary/30 hover:bg-primary/35 transition-colors flex flex-col items-center gap-1">
                  <Users />
                  Resp.
                </button>
                <button onClick={() => handleToggleStatusAluno(aluno.id)} className={`w-16 px-2 rounded-md p-1 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${aluno.status === 'ativo' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-700'}`}>
                  {aluno.status === 'ativo' ? <ShieldMinus /> : <ShieldCheck />}
                  {aluno.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </button>
              </div>

              <div className="md:grow min-w-0 md:col-span-6 gap-3 my-3">
                <div className="ps-2 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    {aluno.fotoUrl ? (
                      <img src={aluno.fotoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Sem</div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 truncate">{aluno.nome}</div>
                    <div className="text-sm text-slate-500 truncate">{turmaNome(aluno.turmaId)}</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 md:w-[300px] hidden md:flex">
                <div className="text-sm text-slate-500 truncate">{turmaNome(aluno.turmaId)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:hidden p-1">
              <button onClick={() => abrirEditarAluno(aluno)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                <Pencil />
              </button>
              <button onClick={() => handleToggleStatusAluno(aluno.id)} className={`h-8 px-2 rounded-e-lg text-xs font-medium border border-primary border-l-0 inline-flex justify-center items-center gap-1 ${aluno.status === 'ativo' ? 'text-red-600' : 'text-emerald-700'}`}>
                {aluno.status === 'ativo' ? <ShieldMinus /> : <ShieldCheck />}
              </button>
            </div>
          </div>
        ))}

        {!carregandoAlunos && alunosPaginados.length === 0 && (
          <div className="py-6 text-sm text-slate-500">Nenhum aluno encontrado.</div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Página {paginaAlunoSegura} de {totalPaginasAluno}</span>
          <div className="flex items-center gap-2">
            <button disabled={paginaAlunoSegura === 1} onClick={() => setPaginaAluno((prev) => Math.max(1, prev - 1))} className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
            <button disabled={paginaAlunoSegura === totalPaginasAluno} onClick={() => setPaginaAluno((prev) => Math.min(totalPaginasAluno, prev + 1))} className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
