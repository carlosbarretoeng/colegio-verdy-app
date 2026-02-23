import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Pencil, Plus, ShieldCheck, ShieldMinus, Trash, Users, X } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ITEMS_PER_PAGE = 5;
const EMPTY_FORM = { nome: '', turmaId: '', fotoUrl: '' };
const EMPTY_RESP_VINCULO_FORM = { responsavelId: '', parentesco: '', podeBuscar: true, contatoEmergencia: false };

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
  const [responsaveis, setResponsaveis] = useState([]);

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
  const [salvandoResponsavelAluno, setSalvandoResponsavelAluno] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', mensagem: '' });
  const [mostrarModalResponsaveis, setMostrarModalResponsaveis] = useState(false);
  const [alunoGerenciandoResponsaveis, setAlunoGerenciandoResponsaveis] = useState(null);
  const [filtroResponsavelNome, setFiltroResponsavelNome] = useState('');
  const [formResponsavelAluno, setFormResponsavelAluno] = useState(EMPTY_RESP_VINCULO_FORM);

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
          fotoUrl: data.fotoUrl || '',
          responsaveis: Array.isArray(data.responsaveis) ? data.responsaveis : []
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setAlunos(lista);
      setCarregandoAlunos(false);

      // Migração: preenche responsaveisIds para alunos que já têm responsaveis mas não têm o campo
      const semIds = snapshot.docs.filter((d) => {
        const data = d.data();
        return Array.isArray(data.responsaveis) &&
               data.responsaveis.length > 0 &&
               !Array.isArray(data.responsaveisIds);
      });

      if (semIds.length > 0) {
        const batch = writeBatch(db);
        semIds.forEach((d) => {
          const ids = d.data().responsaveis.map((r) => r.responsavelId).filter(Boolean);
          batch.update(doc(db, 'students', d.id), { responsaveisIds: ids });
        });
        batch.commit().catch(() => {});
      }
    }, (error) => {
      setCarregandoAlunos(false);
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar os alunos do banco.' });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) return () => { };

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

      setResponsaveis(lista);
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

  const abrirModalResponsaveis = (aluno) => {
    setAlunoGerenciandoResponsaveis(aluno);
    setMostrarModalResponsaveis(true);
    setFiltroResponsavelNome('');
    setFormResponsavelAluno(EMPTY_RESP_VINCULO_FORM);
  };

  const fecharModalResponsaveis = () => {
    setMostrarModalResponsaveis(false);
    setAlunoGerenciandoResponsaveis(null);
    setFiltroResponsavelNome('');
    setFormResponsavelAluno(EMPTY_RESP_VINCULO_FORM);
  };

  const alunoResponsaveisAtualizado = alunoGerenciandoResponsaveis
    ? alunos.find((item) => item.id === alunoGerenciandoResponsaveis.id) || alunoGerenciandoResponsaveis
    : null;

  const vinculosResponsaveisAluno = alunoResponsaveisAtualizado?.responsaveis || [];

  const responsaveisFiltradosModal = useMemo(() => {
    const filtro = filtroResponsavelNome.trim().toLowerCase();
    return responsaveis
      .filter((resp) => resp.status === 'ativo')
      .filter((resp) => !filtro || resp.nome.toLowerCase().includes(filtro));
  }, [responsaveis, filtroResponsavelNome]);

  const handleSalvarVinculoResponsavel = async (event) => {
    event.preventDefault();

    if (!db || !alunoResponsaveisAtualizado) return;

    const responsavelSelecionado = responsaveis.find((resp) => resp.id === formResponsavelAluno.responsavelId);
    const parentesco = formResponsavelAluno.parentesco.trim();

    if (!responsavelSelecionado || !parentesco) return;

    try {
      setSalvandoResponsavelAluno(true);
      setFeedback({ tipo: '', mensagem: '' });

      const existentes = Array.isArray(alunoResponsaveisAtualizado.responsaveis)
        ? alunoResponsaveisAtualizado.responsaveis
        : [];

      const novoVinculo = {
        responsavelId: responsavelSelecionado.id,
        nome: responsavelSelecionado.nome,
        email: responsavelSelecionado.email || '',
        telefone: responsavelSelecionado.telefone || '',
        avatarUrl: responsavelSelecionado.avatarUrl || '',
        parentesco,
        podeBuscar: Boolean(formResponsavelAluno.podeBuscar),
        contatoEmergencia: Boolean(formResponsavelAluno.contatoEmergencia)
      };

      const indiceExistente = existentes.findIndex((item) => item.responsavelId === responsavelSelecionado.id);
      let atualizados = [];

      if (indiceExistente >= 0) {
        atualizados = existentes.map((item, idx) => (idx === indiceExistente ? novoVinculo : item));
      } else {
        atualizados = [...existentes, novoVinculo];
      }

      if (novoVinculo.contatoEmergencia) {
        atualizados = atualizados.map((item) => ({
          ...item,
          contatoEmergencia: item.responsavelId === novoVinculo.responsavelId
        }));
      }

      await updateDoc(doc(db, 'students', alunoResponsaveisAtualizado.id), {
        responsaveis: atualizados,
        responsaveisIds: atualizados.map((r) => r.responsavelId),
        updatedAt: serverTimestamp()
      });

      setFormResponsavelAluno(EMPTY_RESP_VINCULO_FORM);
      setFeedback({ tipo: 'sucesso', mensagem: 'Vínculo de responsável salvo com sucesso.' });
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível salvar o vínculo do responsável.' });
    } finally {
      setSalvandoResponsavelAluno(false);
    }
  };

  const handleEditarVinculoResponsavel = (vinculo) => {
    setFormResponsavelAluno({
      responsavelId: vinculo.responsavelId || '',
      parentesco: vinculo.parentesco || '',
      podeBuscar: Boolean(vinculo.podeBuscar),
      contatoEmergencia: Boolean(vinculo.contatoEmergencia)
    });
  };

  const handleRemoverVinculoResponsavel = async (responsavelId) => {
    if (!db || !alunoResponsaveisAtualizado) return;

    try {
      setSalvandoResponsavelAluno(true);
      setFeedback({ tipo: '', mensagem: '' });

      const existentes = Array.isArray(alunoResponsaveisAtualizado.responsaveis)
        ? alunoResponsaveisAtualizado.responsaveis
        : [];

      const atualizados = existentes.filter((item) => item.responsavelId !== responsavelId);

      await updateDoc(doc(db, 'students', alunoResponsaveisAtualizado.id), {
        responsaveis: atualizados,
        responsaveisIds: atualizados.map((r) => r.responsavelId),
        updatedAt: serverTimestamp()
      });

      if (formResponsavelAluno.responsavelId === responsavelId) {
        setFormResponsavelAluno(EMPTY_RESP_VINCULO_FORM);
      }

      setFeedback({ tipo: 'sucesso', mensagem: 'Vínculo removido com sucesso.' });
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível remover o vínculo do responsável.' });
    } finally {
      setSalvandoResponsavelAluno(false);
    }
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
            {(() => {
              const contatosEmergencia = (aluno.responsaveis || []).filter((vinculo) => vinculo.contatoEmergencia);

              return (
                <div key={aluno.id}>
                  <div className="flex gap-3 md:items-center md:gap-3">
                    <div className="flex hidden md:flex items-center gap-2 flex-wrap col-span-2 p-2">
                      <button onClick={() => abrirEditarAluno(aluno)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                        <Pencil />
                        Editar
                      </button>
                      <button onClick={() => abrirModalResponsaveis(aluno)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-primary bg-primary/15 border border-primary/30 hover:bg-primary/35 transition-colors flex flex-col items-center gap-1">
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
                      <div className="text-sm text-slate-500 truncate">
                        { contatosEmergencia.map((vinculo) => 
                          <div>
                            <div className='font-bold'>{vinculo.nome || 'Responsável'}</div>
                            <div>{vinculo.parentesco || 'Parentesco não informado'} - {vinculo.telefone || 'Sem telefone'}</div>
                          </div>
                        ) }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:hidden p-1">
                    <button onClick={() => abrirEditarAluno(aluno)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                      <Pencil />
                    </button>
                    <button onClick={() => abrirModalResponsaveis(aluno)} className="h-8 px-2 text-xs font-medium text-primary border border-primary inline-flex justify-center items-center gap-1">
                      <Users />
                    </button>
                    <button onClick={() => handleToggleStatusAluno(aluno.id)} className={`h-8 px-2 rounded-e-lg text-xs font-medium border border-primary border-l-0 inline-flex justify-center items-center gap-1 ${aluno.status === 'ativo' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {aluno.status === 'ativo' ? <ShieldMinus /> : <ShieldCheck />}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

        {mostrarModalResponsaveis && alunoResponsaveisAtualizado && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-800">Responsáveis de {alunoResponsaveisAtualizado.nome}</h4>
                <button onClick={fecharModalResponsaveis} className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Fechar
                </button>
              </div>

              <form onSubmit={handleSalvarVinculoResponsavel} className="rounded-lg border border-slate-200 p-3 mb-3 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Responsável
                    <select
                      value={formResponsavelAluno.responsavelId}
                      onChange={(event) => setFormResponsavelAluno((prev) => ({ ...prev, responsavelId: event.target.value }))}
                      className="form-control !py-2.5"
                      required
                    >
                      <option value="">Selecione</option>
                      {responsaveisFiltradosModal.map((responsavel) => (
                        <option key={responsavel.id} value={responsavel.id}>{responsavel.nome}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Parentesco
                    <input
                      value={formResponsavelAluno.parentesco}
                      onChange={(event) => setFormResponsavelAluno((prev) => ({ ...prev, parentesco: event.target.value }))}
                      placeholder="Ex.: Mãe, Pai, Avó, Tio"
                      className="form-control !py-2.5"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={formResponsavelAluno.podeBuscar}
                      onChange={(event) => setFormResponsavelAluno((prev) => ({ ...prev, podeBuscar: event.target.checked }))}
                    />
                    Pode buscar o aluno
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={formResponsavelAluno.contatoEmergencia}
                      onChange={(event) => setFormResponsavelAluno((prev) => ({ ...prev, contatoEmergencia: event.target.checked }))}
                    />
                    Contato de emergência
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={salvandoResponsavelAluno}
                    className="h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {salvandoResponsavelAluno ? 'Salvando...' : 'Salvar vínculo'}
                  </button>
                </div>
              </form>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2">Vínculos atuais ({vinculosResponsaveisAluno.length})</div>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {vinculosResponsaveisAluno.map((vinculo) => (
                    <div key={vinculo.responsavelId} className={`rounded-lg border px-3 py-2 ${vinculo.contatoEmergencia ? 'bg-amber-50 border-amber-500' : ''}`}>
                      <div className="flex items-center justify-start gap-2">
                        
                        <div className="flex hidden md:flex items-center gap-2 flex-wrap col-span-2 py-2">
                          <button onClick={() => handleEditarVinculoResponsavel(vinculo)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                            <Pencil />
                            Editar
                          </button>
                          <button onClick={() => handleRemoverVinculoResponsavel(vinculo.responsavelId)} className={`w-16 px-2 rounded-md p-1 text-xs font-medium transition-colors flex flex-col items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-700`}>
                            <Trash />
                            Excluir
                          </button>
                        </div>
                        
                        <div className="ps-2 flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            <img src={vinculo.avatarUrl} alt={vinculo.nome} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 truncate">{vinculo.nome || 'Responsável'}</div>
                            <div className="text-sm text-slate-500 truncate">{vinculo.parentesco || 'Sem parentesco'} • {vinculo.podeBuscar ? 'Pode buscar' : 'Não pode buscar'}{vinculo.contatoEmergencia ? ' • Emergência' : ''}</div>
                          </div>
                        </div>
                      </div>
                      <div className='w-full md:hidden'>
                        <div className="grid grid-cols-2 md:hidden p-1">
                          <button onClick={() => handleEditarVinculoResponsavel(vinculo)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                            <Pencil />
                          </button>
                          <button onClick={() => handleRemoverVinculoResponsavel(vinculo.responsavelId)} className={`h-8 px-2 rounded-e-lg text-xs font-medium border border-primary border-l-0 inline-flex justify-center items-center gap-1`}>
                            <X />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {vinculosResponsaveisAluno.length === 0 && <div className="text-sm text-slate-400">Nenhum responsável vinculado.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

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
