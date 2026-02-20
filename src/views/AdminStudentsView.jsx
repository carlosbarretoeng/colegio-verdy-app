import React, { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';

const TURMAS = [
  { id: 't1', nome: 'Berçário II', periodo: 'Integral', status: 'ativa' },
  { id: 't2', nome: 'Maternal I', periodo: 'Matutino', status: 'ativa' },
  { id: 't3', nome: 'Maternal II', periodo: 'Vespertino', status: 'inativa' },
  { id: 't4', nome: 'Jardim I', periodo: 'Matutino', status: 'ativa' },
  { id: 't5', nome: 'Jardim II', periodo: 'Vespertino', status: 'ativa' },
  { id: 't6', nome: 'Pré I', periodo: 'Integral', status: 'inativa' }
];

const ALUNOS = [
  { id: 'a1', nome: 'Ana Clara Souza', turmaId: 't1', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Ana+Clara+Souza&background=e2e8f0&color=0f172a' },
  { id: 'a2', nome: 'Pedro Henrique Lima', turmaId: 't2', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Pedro+Henrique+Lima&background=dbeafe&color=1e3a8a' },
  { id: 'a3', nome: 'Lívia Fernandes', turmaId: 't2', status: 'inativo', fotoUrl: 'https://ui-avatars.com/api/?name=Livia+Fernandes&background=fce7f3&color=9d174d' },
  { id: 'a4', nome: 'Lucas Martins', turmaId: 't4', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Lucas+Martins&background=dcfce7&color=166534' },
  { id: 'a5', nome: 'Sofia Almeida', turmaId: 't5', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Sofia+Almeida&background=fef3c7&color=92400e' },
  { id: 'a6', nome: 'Miguel Costa', turmaId: 't3', status: 'inativo', fotoUrl: 'https://ui-avatars.com/api/?name=Miguel+Costa&background=e0e7ff&color=3730a3' },
  { id: 'a7', nome: 'Helena Rocha', turmaId: 't1', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Helena+Rocha&background=fee2e2&color=991b1b' },
  { id: 'a8', nome: 'Arthur Nunes', turmaId: 't5', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Arthur+Nunes&background=cffafe&color=155e75' },
  { id: 'a9', nome: 'Isabella Campos', turmaId: 't4', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Isabella+Campos&background=ede9fe&color=5b21b6' },
  { id: 'a10', nome: 'Theo Ribeiro', turmaId: 't6', status: 'inativo', fotoUrl: 'https://ui-avatars.com/api/?name=Theo+Ribeiro&background=ffedd5&color=9a3412' },
  { id: 'a11', nome: 'Valentina Dias', turmaId: 't1', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Valentina+Dias&background=fce7f3&color=9d174d' },
  { id: 'a12', nome: 'Gael Oliveira', turmaId: 't2', status: 'ativo', fotoUrl: 'https://ui-avatars.com/api/?name=Gael+Oliveira&background=dbeafe&color=1d4ed8' }
];

const ITEMS_PER_PAGE = 5;

const EMPTY_FORM = {
  nome: '',
  turmaId: '',
  fotoUrl: ''
};

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

async function renderEditedImage(src, zoom, rotationDeg) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao processar imagem.'));
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return src;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  context.rotate((rotationDeg * Math.PI) / 180);

  const ratio = Math.max(size / image.width, size / image.height);
  const finalScale = ratio * zoom;
  const width = image.width * finalScale;
  const height = image.height * finalScale;
  context.drawImage(image, -width / 2, -height / 2, width, height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function AdminStudentsView() {
  const [turmas] = useState(TURMAS);
  const [alunos, setAlunos] = useState(ALUNOS);

  const [mostrarFormAluno, setMostrarFormAluno] = useState(false);
  const [alunoEmEdicaoId, setAlunoEmEdicaoId] = useState(null);
  const [formAluno, setFormAluno] = useState(EMPTY_FORM);
  const [fotoFonte, setFotoFonte] = useState('');
  const [fotoZoom, setFotoZoom] = useState(1);
  const [fotoRotacao, setFotoRotacao] = useState(0);

  const [filtroAlunoNome, setFiltroAlunoNome] = useState('');
  const [filtroAlunoStatus, setFiltroAlunoStatus] = useState('todos');
  const [filtroAlunoTurma, setFiltroAlunoTurma] = useState('todas');
  const [paginaAluno, setPaginaAluno] = useState(1);

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
    setFotoFonte('');
    setFotoZoom(1);
    setFotoRotacao(0);
    setMostrarFormAluno(true);
  };

  const abrirEditarAluno = (aluno) => {
    setAlunoEmEdicaoId(aluno.id);
    setFormAluno({ nome: aluno.nome, turmaId: aluno.turmaId, fotoUrl: aluno.fotoUrl || '' });
    setFotoFonte(aluno.fotoUrl || '');
    setFotoZoom(1);
    setFotoRotacao(0);
    setMostrarFormAluno(true);
  };

  const fecharFormAluno = () => {
    setMostrarFormAluno(false);
    setAlunoEmEdicaoId(null);
    setFormAluno(EMPTY_FORM);
    setFotoFonte('');
    setFotoZoom(1);
    setFotoRotacao(0);
  };

  const handleSelecionarFoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await loadFileAsDataUrl(file);
    setFotoFonte(dataUrl);
    setFotoZoom(1);
    setFotoRotacao(0);
    event.target.value = '';
  };

  const handleSalvarAluno = async (event) => {
    event.preventDefault();

    const nome = formAluno.nome.trim();
    const turmaId = formAluno.turmaId;
    if (!nome || !turmaId) return;

    let fotoFinal = formAluno.fotoUrl;
    if (fotoFonte) fotoFinal = await renderEditedImage(fotoFonte, fotoZoom, fotoRotacao);
    if (!fotoFinal) fotoFinal = createAvatarUrl(nome);

    if (alunoEmEdicaoId) {
      setAlunos((prev) => prev.map((aluno) => (
        aluno.id === alunoEmEdicaoId ? { ...aluno, nome, turmaId, fotoUrl: fotoFinal } : aluno
      )));
    } else {
      setAlunos((prev) => ([{ id: `a${Date.now()}`, nome, turmaId, status: 'ativo', fotoUrl: fotoFinal }, ...prev]));
    }

    setPaginaAluno(1);
    fecharFormAluno();
  };

  const handleToggleStatusAluno = (alunoId) => {
    setAlunos((prev) => prev.map((aluno) => (
      aluno.id === alunoId ? { ...aluno, status: aluno.status === 'ativo' ? 'inativo' : 'ativo' } : aluno
    )));
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Alunos</h2>
        <p className="text-sm text-slate-500 mt-1">Cadastro, edição e status de alunos com foto.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Alunos</h3>
          <button onClick={mostrarFormAluno ? fecharFormAluno : abrirNovoAluno} className="h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
            {mostrarFormAluno ? 'Cancelar' : 'Adicionar aluno'}
          </button>
        </div>

        {mostrarFormAluno && (
          <form onSubmit={handleSalvarAluno} className="mb-5 rounded-xl border border-slate-200 p-4 bg-white/80 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={formAluno.nome} onChange={(event) => setFormAluno((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome do aluno" className="form-control !py-2.5" required />
              <select value={formAluno.turmaId} onChange={(event) => setFormAluno((prev) => ({ ...prev, turmaId: event.target.value }))} className="form-control !py-2.5" required>
                <option value="">Selecione a turma</option>
                {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
              </select>
              <input value={formAluno.fotoUrl} onChange={(event) => setFormAluno((prev) => ({ ...prev, fotoUrl: event.target.value }))} placeholder="URL da foto (opcional)" className="form-control !py-2.5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Upload da foto</label>
                <input type="file" accept="image/*" onChange={handleSelecionarFoto} className="form-control !py-2" />
                <label className="text-sm font-medium text-slate-600">Tirar foto (celular)</label>
                <input type="file" accept="image/*" capture="environment" onChange={handleSelecionarFoto} className="form-control !py-2" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-slate-600">Prévia da foto</div>
                <div className="w-28 h-28 rounded-full overflow-hidden border border-slate-200 mx-auto bg-slate-100 relative">
                  {(fotoFonte || formAluno.fotoUrl) && (
                    <img src={fotoFonte || formAluno.fotoUrl} alt="Prévia" className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scale(${fotoZoom}) rotate(${fotoRotacao}deg)` }} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">Zoom
                    <input type="range" min="1" max="2.5" step="0.1" value={fotoZoom} onChange={(event) => setFotoZoom(Number(event.target.value))} className="w-full" />
                  </label>
                  <label className="text-xs text-slate-500">Rotação
                    <input type="range" min="-180" max="180" step="5" value={fotoRotacao} onChange={(event) => setFotoRotacao(Number(event.target.value))} className="w-full" />
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" className="h-10 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors self-end">
              {alunoEmEdicaoId ? 'Salvar edição' : 'Salvar aluno'}
            </button>
          </form>
        )}

        <div className="flex flex-col gap-3 mb-4 md:flex-row">
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

        {alunosPaginados.map((aluno) => (
          <div key={aluno.id} className="py-2 border-b border-slate-100 last:border-b-0 text-slate-700 grid grid-cols-12 gap-3">
            <div className="col-span-2 gap-2">
              <button onClick={() => abrirEditarAluno(aluno)} className="h-8 px-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1">
                <Pencil size={12} /> Editar
              </button>
              <button onClick={() => handleToggleStatusAluno(aluno.id)} className={`h-8 px-2 rounded-lg text-xs font-medium transition-colors ${aluno.status === 'ativo' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                {aluno.status === 'ativo' ? 'Inativar' : 'Ativar'}
              </button>
            </div>

            <div className="col-span-8 flex items-center gap-3">
              <img src={aluno.fotoUrl || createAvatarUrl(aluno.nome)} alt={aluno.nome} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              <div className="min-w-0 text-left">
                <div className="font-medium truncate">{aluno.nome}</div>
              </div>
            </div>

            <div className="col-span-2">
              <div className="text-sm text-slate-500">{turmaNome(aluno.turmaId)}</div>
            </div>
          </div>
        ))}

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
