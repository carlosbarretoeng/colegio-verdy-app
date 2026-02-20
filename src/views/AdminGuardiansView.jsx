import React, { useMemo, useState } from 'react';

const RESPONSAVEIS = [
  { id: 'r1', nome: 'Carla Souza', parentesco: 'Mãe', status: 'ativo' },
  { id: 'r2', nome: 'Marcos Lima', parentesco: 'Pai', status: 'ativo' },
  { id: 'r3', nome: 'Renata Fernandes', parentesco: 'Mãe', status: 'inativo' },
  { id: 'r4', nome: 'Fernanda Almeida', parentesco: 'Mãe', status: 'ativo' }
];

const ITEMS_PER_PAGE = 5;

export default function AdminGuardiansView() {
  const [responsaveis] = useState(RESPONSAVEIS);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => responsaveis.filter((responsavel) => {
    const nomeValido = responsavel.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const statusValido = filtroStatus === 'todos' ? true : responsavel.status === filtroStatus;
    return nomeValido && statusValido;
  }), [responsaveis, filtroNome, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaSegura - 1) * ITEMS_PER_PAGE, paginaSegura * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Responsáveis</h2>
        <p className="text-sm text-slate-500 mt-1">Cadastro e acompanhamento dos responsáveis dos alunos.</p>
      </div>

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input value={filtroNome} onChange={(e) => { setFiltroNome(e.target.value); setPagina(1); }} placeholder="Buscar por nome" className="form-control !py-2.5" />
          <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }} className="form-control !py-2.5">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        {paginados.map((responsavel) => (
          <div key={responsavel.id} className="py-2 border-b border-slate-100 last:border-b-0 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">{responsavel.nome}</div>
              <div className="text-sm text-slate-500">{responsavel.parentesco}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${responsavel.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{responsavel.status}</span>
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
