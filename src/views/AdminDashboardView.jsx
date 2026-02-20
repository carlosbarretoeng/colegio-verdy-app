import React from 'react';
import { Users, UserCheck, School, CalendarDays, MessageSquare, MessageSquareDashed } from 'lucide-react';

const INDICADORES = [
  { id: 'i1', label: 'Total de Alunos', valor: '128', icon: Users, color: 'text-primary bg-primary/10' },
  { id: 'i2', label: 'Turmas Ativas', valor: '8', icon: School, color: 'text-primary bg-primary/10' },
  { id: 'i3', label: 'Eventos', valor: '8', icon: CalendarDays, color: 'text-primary bg-primary/10' },
  { id: 'i3', label: 'Comunicados', valor: '8', icon: MessageSquareDashed, color: 'text-primary bg-primary/10' },
];

const EVENTOS = [
  { id: 'e1', dia: '22', mes: 'FEV', titulo: 'Reunião Pedagógica', horario: '14:00' },
  { id: 'e2', dia: '25', mes: 'FEV', titulo: 'Entrega de Relatórios', horario: '09:00' },
  { id: 'e3', dia: '03', mes: 'MAR', titulo: 'Início Projeto Leitura', horario: '08:30' }
];

const MENSAGENS = [
  { id: 'm1', titulo: 'Comunicado Geral', texto: 'Atualização do calendário escolar disponível para famílias.', tempo: 'há 10 min' },
  { id: 'm2', titulo: 'Coordenação', texto: 'Lembrete sobre prazo de envio das avaliações mensais.', tempo: 'há 1 h' },
  { id: 'm3', titulo: 'Secretaria', texto: 'Documentação de novos alunos em conferência.', tempo: 'há 3 h' }
];

export default function AdminDashboardView() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard da Administração</h2>
        <p className="text-sm text-slate-500 mt-1">Visão consolidada da operação escolar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {INDICADORES.map((item) => (
          <div key={item.id} className="glass-panel p-5 border border-slate-200/60 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</div>
              <div className="text-2xl font-bold text-slate-800">{item.valor}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-panel p-5 border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-slate-500" />
            <h3 className="text-lg font-bold text-slate-800">Calendário Administrativo</h3>
          </div>

          <div className="flex flex-col gap-3">
            {EVENTOS.map((evento) => (
              <div key={evento.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-slate-800 leading-none">{evento.dia}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{evento.mes}</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{evento.titulo}</div>
                  <div className="text-sm text-slate-500">{evento.horario}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-slate-500" />
            <h3 className="text-lg font-bold text-slate-800">Mensagens Recentes</h3>
          </div>

          <div className="flex flex-col gap-3">
            {MENSAGENS.map((mensagem) => (
              <div key={mensagem.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="font-semibold text-slate-800">{mensagem.titulo}</div>
                  <div className="text-xs text-slate-400">{mensagem.tempo}</div>
                </div>
                <div className="text-sm text-slate-500">{mensagem.texto}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
