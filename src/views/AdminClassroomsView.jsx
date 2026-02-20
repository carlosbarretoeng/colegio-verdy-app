import React, { useMemo, useState } from 'react';

const TURMAS = [
  { id: 't1', nome: 'Berçário II', periodo: 'Integral', status: 'ativa' },
  { id: 't2', nome: 'Maternal I', periodo: 'Matutino', status: 'ativa' },
  { id: 't3', nome: 'Maternal II', periodo: 'Vespertino', status: 'inativa' },
  { id: 't4', nome: 'Jardim I', periodo: 'Matutino', status: 'ativa' },
  { id: 't5', nome: 'Jardim II', periodo: 'Vespertino', status: 'ativa' },
  { id: 't6', nome: 'Pré I', periodo: 'Integral', status: 'inativa' }
];

const ITEMS_PER_PAGE = 5;

export default function AdminClassroomsView() {
  const [turmas] = useState(TURMAS);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [pagina, setPagina] = useState(1);

  const periodos = useMemo(() => [...new Set(turmas.map((turma) => turma.periodo))], [turmas]);

  const filtradas = useMemo(() => turmas.filter((turma) => {
    const nomeValido = turma.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const statusValido = filtroStatus === 'todos' ? true : turma.status === filtroStatus;
    const periodoValido = filtroPeriodo === 'todos' ? true : turma.periodo === filtroPeriodo;
    return nomeValido && statusValido && periodoValido;
  }), [turmas, filtroNome, filtroStatus, filtroPeriodo]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginadas = filtradas.slice((paginaSegura - 1) * ITEMS_PER_PAGE, paginaSegura * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Turmas</h2>
        <p className="text-sm text-slate-500 mt-1">Organização das turmas e períodos da escola.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
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

        {paginadas.map((turma) => (
          <div key={turma.id} className="py-2 border-b border-slate-100 last:border-b-0 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">{turma.nome}</div>
              <div className="text-sm text-slate-500">{turma.periodo}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${turma.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{turma.status}</span>
          </div>
        ))}

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
