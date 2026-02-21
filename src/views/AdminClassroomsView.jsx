import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Filter, Pencil, Plus, ShieldCheck, ShieldMinus, Users, X } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ITEMS_PER_PAGE = 5;
const EMPTY_FORM = { nome: '', periodo: 'Integral', professorId: '' };

export default function AdminClassroomsView() {
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);

  const [mostrarFormTurma, setMostrarFormTurma] = useState(false);
  const [turmaEmEdicaoId, setTurmaEmEdicaoId] = useState(null);
  const [formTurma, setFormTurma] = useState(EMPTY_FORM);

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [salvandoTurma, setSalvandoTurma] = useState(false);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAlunos, setCarregandoAlunos] = useState(true);
  const [feedback, setFeedback] = useState({ tipo: '', mensagem: '' });
  const [turmaGerenciadaId, setTurmaGerenciadaId] = useState(null);
  const [mostrarModalVinculo, setMostrarModalVinculo] = useState(false);
  const [buscaAlunoModal, setBuscaAlunoModal] = useState('');

  useEffect(() => {
    if (!db) {
      setCarregando(false);
      setFeedback({ tipo: 'erro', mensagem: 'Banco de dados não configurado.' });
      return () => { };
    }

    const unsubscribe = onSnapshot(collection(db, 'classrooms'), (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nome: data.nome || 'Sem nome',
          periodo: data.periodo || '',
          professorId: data.professorId || '',
          professorNome: data.professorNome || '',
          status: data.status || 'ativa'
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setTurmas(lista);
      setCarregando(false);
    }, (error) => {
      setCarregando(false);
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível carregar as turmas do banco.' });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) return () => { };

    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nome: data.nome || 'Sem nome',
          status: data.status || 'ativo'
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setProfessores(lista);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) {
      setCarregandoAlunos(false);
      return () => { };
    }

    const unsubscribe = onSnapshot(query(collection(db, 'students')), (snapshot) => {
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
    }, () => {
      setCarregandoAlunos(false);
    });

    return unsubscribe;
  }, []);

  const periodos = useMemo(() => [...new Set(turmas.map((turma) => turma.periodo).filter(Boolean))], [turmas]);
  const periodosFormulario = useMemo(() => {
    const base = ['Matutino', 'Vespertino', 'Integral'];
    return [...new Set([...base, ...periodos])];
  }, [periodos]);

  const filtradas = useMemo(() => turmas.filter((turma) => {
    const nomeValido = turma.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const statusValido = filtroStatus === 'todos' ? true : turma.status === filtroStatus;
    const periodoValido = filtroPeriodo === 'todos' ? true : turma.periodo === filtroPeriodo;
    return nomeValido && statusValido && periodoValido;
  }), [turmas, filtroNome, filtroStatus, filtroPeriodo]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginadas = filtradas.slice((paginaSegura - 1) * ITEMS_PER_PAGE, paginaSegura * ITEMS_PER_PAGE);

  const turmaGerenciada = turmas.find((turma) => turma.id === turmaGerenciadaId) || null;

  const alunosDaTurma = useMemo(() => {
    if (!turmaGerenciadaId) return [];
    return alunos.filter((aluno) => aluno.turmaId === turmaGerenciadaId);
  }, [alunos, turmaGerenciadaId]);

  const alunosModalFiltrados = useMemo(() => {
    if (!turmaGerenciadaId) return [];
    const busca = buscaAlunoModal.trim().toLowerCase();
    if (!busca) return [];

    return alunos
      .filter((aluno) => aluno.nome.toLowerCase().includes(busca))
      .slice(0, 20);
  }, [alunos, turmaGerenciadaId, buscaAlunoModal]);

  const abrirNovaTurma = () => {
    setTurmaEmEdicaoId(null);
    setFormTurma(EMPTY_FORM);
    setMostrarFormTurma(true);
  };

  const abrirEditarTurma = (turma) => {
    setTurmaEmEdicaoId(turma.id);
    setFormTurma({ nome: turma.nome, periodo: turma.periodo || '', professorId: turma.professorId || '' });
    setMostrarFormTurma(true);
  };

  const fecharFormTurma = () => {
    setTurmaEmEdicaoId(null);
    setFormTurma(EMPTY_FORM);
    setMostrarFormTurma(false);
  };

  const handleSalvarTurma = (event) => {
    event.preventDefault();

    const salvar = async () => {
      setFeedback({ tipo: '', mensagem: '' });
      setSalvandoTurma(true);

      const nome = formTurma.nome.trim();
      const periodo = formTurma.periodo.trim();
      const professorId = formTurma.professorId;
      const professorSelecionado = professores.find((professor) => professor.id === professorId);

      if (!nome || !periodo || !professorId || !professorSelecionado) {
        setSalvandoTurma(false);
        return;
      }

      try {
        if (!db) throw new Error('Banco de dados não configurado.');

        if (!turmaEmEdicaoId) {
          await addDoc(collection(db, 'classrooms'), {
            nome,
            periodo,
            professorId,
            professorNome: professorSelecionado.nome,
            status: 'ativa',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setFeedback({ tipo: 'sucesso', mensagem: 'Turma cadastrada com sucesso.' });
        } else {
          await updateDoc(doc(db, 'classrooms', turmaEmEdicaoId), {
            nome,
            periodo,
            professorId,
            professorNome: professorSelecionado.nome,
            updatedAt: serverTimestamp()
          });
          setFeedback({ tipo: 'sucesso', mensagem: 'Dados da turma atualizados com sucesso.' });
        }

        setPagina(1);
        fecharFormTurma();
      } catch (error) {
        setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível salvar a turma.' });
      } finally {
        setSalvandoTurma(false);
      }
    };

    salvar();
  };

  const handleToggleStatusTurma = (turmaId) => {
    const atualizar = async () => {
      if (!db) throw new Error('Banco de dados não configurado.');
      const turmaAtual = turmas.find((item) => item.id === turmaId);
      if (!turmaAtual) return;

      await updateDoc(doc(db, 'classrooms', turmaId), {
        status: turmaAtual.status === 'ativa' ? 'inativa' : 'ativa',
        updatedAt: serverTimestamp()
      });
    };

    atualizar().catch((error) => {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível atualizar o status da turma.' });
    });
  };

  const handleGerenciarTurma = (turmaId) => {
    setTurmaGerenciadaId((atual) => (atual === turmaId ? null : turmaId));
    setMostrarModalVinculo(false);
    setBuscaAlunoModal('');
  };

  const handleVincularAluno = async (aluno) => {
    try {
      if (!db || !turmaGerenciadaId) throw new Error('Selecione uma turma para vincular alunos.');

      setSalvandoVinculo(true);
      setFeedback({ tipo: '', mensagem: '' });

      await updateDoc(doc(db, 'students', aluno.id), {
        turmaId: turmaGerenciadaId,
        updatedAt: serverTimestamp()
      });

      setFeedback({
        tipo: 'sucesso',
        mensagem: aluno.turmaId && aluno.turmaId !== turmaGerenciadaId
          ? 'Aluno transferido para a turma com sucesso.'
          : 'Aluno vinculado à turma com sucesso.'
      });
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível vincular o aluno.' });
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const handleRemoverAlunoDaTurma = async (alunoId) => {
    try {
      if (!db) throw new Error('Dados não disponíveis para remover aluno.');

      setSalvandoVinculo(true);
      setFeedback({ tipo: '', mensagem: '' });

      await updateDoc(doc(db, 'students', alunoId), {
        turmaId: null,
        updatedAt: serverTimestamp()
      });

      setFeedback({ tipo: 'sucesso', mensagem: 'Aluno removido da turma com sucesso.' });
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: error?.message || 'Não foi possível remover o aluno da turma.' });
    } finally {
      setSalvandoVinculo(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Turmas</h2>
        <p className="text-sm text-slate-500 mt-1">Organização das turmas e períodos da escola.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Turmas</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltrosMobile((prev) => !prev)}
              className={`md:hidden h-9 w-9 rounded-lg border transition-colors inline-flex items-center justify-center ${mostrarFiltrosMobile ? 'bg-primary text-white border-primary' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
              aria-label="Filtros"
            >
              <Filter size={16} />
            </button>
            <button
              onClick={mostrarFormTurma ? fecharFormTurma : abrirNovaTurma}
              className="md:hidden h-9 w-9 rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors inline-flex items-center justify-center"
              aria-label="Adicionar turma"
            >
              {mostrarFormTurma ? <X size={16} /> : <Plus size={16} />}
              
            </button>
            <button onClick={mostrarFormTurma ? fecharFormTurma : abrirNovaTurma} className="hidden md:inline-flex h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors items-center">
              {mostrarFormTurma ? 'Cancelar' : 'Adicionar turma'}
            </button>
          </div>
        </div>

        {mostrarFormTurma && (
          <form onSubmit={handleSalvarTurma} className="mb-5 rounded-xl border border-slate-200 p-4 bg-white/80 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col md:col-span-2 gap-1 text-sm text-slate-600">
                Nome da turma
                <input value={formTurma.nome} onChange={(event) => setFormTurma((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome da turma" className="form-control !py-2.5" required />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Período
                <select value={formTurma.periodo} onChange={(event) => setFormTurma((prev) => ({ ...prev, periodo: event.target.value }))} className="form-control !py-2.5">
                  {periodosFormulario.map((periodo) => <option key={periodo} value={periodo}>{periodo}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Professor responsável
                <select value={formTurma.professorId} onChange={(event) => setFormTurma((prev) => ({ ...prev, professorId: event.target.value }))} className="form-control !py-2.5" required>
                  <option value="">Selecione</option>
                  {professores.filter((professor) => professor.status === 'ativo' || professor.id === formTurma.professorId)
                    .map((professor) => <option key={professor.id} value={professor.id}>{professor.nome}</option>)}
                </select>
              </label>
            </div>

            <button type="submit" disabled={salvandoTurma} className="h-10 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end disabled:opacity-60">
              {turmaEmEdicaoId ? 'Salvar edição' : 'Salvar turma'}
            </button>
          </form>
        )}

        {feedback.mensagem && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {feedback.mensagem}
          </div>
        )}

        <div className={`${mostrarFiltrosMobile ? 'flex' : 'hidden'} flex-col md:flex md:flex-row gap-3 mb-4`}>
          <input value={filtroNome} onChange={(e) => { setFiltroNome(e.target.value); setPagina(1); }} placeholder="Buscar por turma" className="form-control !py-2.5" />
          <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }} className="form-control !py-2.5">
            <option value="todos">Todos os status</option>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </select>
          <select value={filtroPeriodo} onChange={(e) => { setFiltroPeriodo(e.target.value); setPagina(1); }} className="form-control !py-2.5">
            <option value="todos">Todos os períodos</option>
            {periodos.map((periodo) => <option key={periodo} value={periodo}>{periodo}</option>)}
          </select>
        </div>

        {turmaGerenciada && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-800">Gerenciar alunos da turma: {turmaGerenciada.nome}</h4>
              <button onClick={() => setTurmaGerenciadaId(null)} className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Fechar</button>
            </div>

            {carregandoAlunos ? (
              <div className="text-sm text-slate-500">Carregando alunos...</div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setMostrarModalVinculo(true)}
                    className="h-9 w-full md:w-auto px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors"
                  >
                    Buscar e vincular aluno
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Alunos da turma: {alunosDaTurma.length}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {alunosDaTurma.map((aluno) => (
                      <div key={aluno.id} className="flex items-center justify-between bg-slate-100 gap-3 rounded-lg border shadown-md border-slate-300 px-3 py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            {aluno.fotoUrl ? (
                              <img src={aluno.fotoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-semibold">
                                {aluno.nome?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-slate-700 truncate">{aluno.nome}</span>
                        </div>
                        <button
                          disabled={salvandoVinculo}
                          onClick={() => handleRemoverAlunoDaTurma(aluno.id)}
                          className="h-7 px-2 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {alunosDaTurma.length === 0 && (
                      <div className="text-sm text-slate-400">Nenhum aluno vinculado.</div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Use “Buscar e vincular aluno” para localizar por nome e incluir na turma.
                </div>
              </div>
            )}
          </div>
        )}

        {mostrarModalVinculo && turmaGerenciada && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-800">{turmaGerenciada.nome}</h4>
                <button
                  onClick={() => {
                    setMostrarModalVinculo(false);
                    setBuscaAlunoModal('');
                  }}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>

              <input
                value={buscaAlunoModal}
                onChange={(event) => setBuscaAlunoModal(event.target.value)}
                placeholder="Digite o nome do aluno"
                className="form-control !py-2.5 mb-3"
              />

              {!buscaAlunoModal.trim() && (
                <div className="text-sm text-slate-500 py-4">Digite um nome para buscar alunos.</div>
              )}

              {buscaAlunoModal.trim() && (
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {alunosModalFiltrados.map((aluno) => {
                    const jaNaTurma = aluno.turmaId === turmaGerenciadaId;
                    const emOutraTurma = aluno.turmaId && !jaNaTurma;

                    return (
                      <div key={aluno.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            {aluno.fotoUrl ? (
                              <img src={aluno.fotoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-semibold">
                                {aluno.nome?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-700 truncate">{aluno.nome}</div>
                            {jaNaTurma && <div className="text-xs text-emerald-700">Já está nesta turma</div>}
                            {emOutraTurma && <div className="text-xs text-amber-700">Está em outra turma</div>}
                          </div>
                        </div>

                        <button
                          disabled={salvandoVinculo || jaNaTurma}
                          onClick={() => handleVincularAluno(aluno)}
                          className="h-8 px-2 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {jaNaTurma ? 'Vinculado' : emOutraTurma ? 'Transferir' : 'Vincular'}
                        </button>
                      </div>
                    );
                  })}
                  {alunosModalFiltrados.length === 0 && <div className="text-sm text-slate-400">Nenhum aluno encontrado.</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {carregando && <div className="py-6 text-sm text-slate-500">Carregando turmas...</div>}

        {!carregando && paginadas.map((turma) => (
          <div key={turma.id} className={`mb-2 rounded-lg bg-slate-100 border border-slate-200 shadow-md text-slate-700 ${turma.status === 'ativa' ? 'border-l-8 border-l-emerald-500' : 'border-l-8 border-l-red-500'}`}>
            <div className="flex gap-3 md:items-center md:gap-3">
              <div className="flex hidden md:flex items-center gap-2 flex-wrap col-span-2 p-2">
                <button onClick={() => abrirEditarTurma(turma)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                  <Pencil />
                  Editar
                </button>
                <button onClick={() => handleGerenciarTurma(turma.id)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-primary bg-primary/15 border border-primary/30 hover:bg-primary/35 transition-colors flex flex-col items-center gap-1">
                  <BookOpen />
                  Alunos
                </button>
                <button onClick={() => handleToggleStatusTurma(turma.id)} className={`w-16 px-2 rounded-md p-1 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${turma.status === 'ativa' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-700'}`}>
                  {turma.status === 'ativa' ? <ShieldMinus /> : <ShieldCheck />}
                  {turma.status === 'ativa' ? 'Inativar' : 'Ativar'}
                </button>
              </div>

              <div className="md:grow min-w-0 md:col-span-6 gap-3 my-3">
                <div className="ps-2">
                  <div className="font-medium text-slate-800 truncate">{turma.nome} - {turma.periodo || 'Sem período'}</div>
                  <div className="text-sm text-slate-500 truncate">{turma.professorNome || 'Não definido'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 md:hidden p-1">
              <button onClick={() => abrirEditarTurma(turma)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                <Pencil />
              </button>
              <button onClick={() => handleGerenciarTurma(turma.id)} className="h-8 px-2 text-xs font-medium text-slate-700 border border-primary justify-center inline-flex items-center gap-1">
                <Users />
              </button>
              <button onClick={() => handleToggleStatusTurma(turma.id)} className={`h-8 px-2 rounded-e-lg text-xs font-medium border border-primary border-l-0 inline-flex justify-center items-center gap-1 ${turma.status === 'ativa' ? 'text-red-600' : 'text-emerald-700'}`}>
                {turma.status === 'ativa' ? <ShieldMinus /> : <ShieldCheck />}
              </button>
            </div>
          </div>
        ))}

        {!carregando && paginadas.length === 0 && (
          <div className="py-6 text-sm text-slate-500">Nenhuma turma encontrada.</div>
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
