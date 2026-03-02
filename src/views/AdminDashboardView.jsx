import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Megaphone, MessageSquare, MessageSquareDashed, School, Users } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminDashboardView() {
  const [totalAlunos, setTotalAlunos] = useState(null);
  const [totalTurmasAtivas, setTotalTurmasAtivas] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(true);

  useEffect(() => {
    if (!db) return () => { };

    const unsubscribers = [];

    unsubscribers.push(
      onSnapshot(collection(db, 'students'), (snapshot) => {
        setTotalAlunos(snapshot.size);
      }, () => {
        setTotalAlunos(0);
      })
    );

    unsubscribers.push(
      onSnapshot(query(collection(db, 'classrooms'), where('status', '==', 'ativa')), (snapshot) => {
        setTotalTurmasAtivas(snapshot.size);
      }, () => {
        setTotalTurmasAtivas(0);
      })
    );

    const _td = new Date();
    const todayStr = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
    unsubscribers.push(
      onSnapshot(query(collection(db, 'events'), where('data', '>=', todayStr), orderBy('data', 'asc'), limit(5)), (snapshot) => {
        const lista = snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            titulo: data.titulo || 'Sem título',
            tipo: data.tipo || 'Administrativos',
            data: data.data || '',
            local: data.local || '',
            diaTodo: !!data.diaTodo,
            horario: data.horario || '',
            anexoUrl: data.anexoUrl || '',
            anexoNome: data.anexoNome || ''
          };
        });

        setEventos(lista);
        setCarregandoEventos(false);
      }, () => {
        setEventos([]);
        setCarregandoEventos(false);
      })
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const formatarDataEvento = (dataISO) => {
    if (!dataISO) return { dia: '--', mes: '---' };
    const [ano, mes, dia] = dataISO.split('-');
    if (!ano || !mes || !dia) return { dia: '--', mes: '---' };
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

    return {
      dia: String(data.getDate()).padStart(2, '0'),
      mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    };
  };

  const indicadores = useMemo(() => ([
    { id: 'i1', label: 'Total de Alunos', valor: totalAlunos, icon: Users, color: 'text-primary bg-primary/10' },
    { id: 'i2', label: 'Turmas Ativas', valor: totalTurmasAtivas, icon: School, color: 'text-primary bg-primary/10' },
    { id: 'i3', label: 'Calendário', valor: eventos.length, icon: CalendarDays, color: 'text-primary bg-primary/10' },
    { id: 'i4', label: 'Comunicados', valor: '-', icon: MessageSquareDashed, color: 'text-primary bg-primary/10' }
  ]), [totalAlunos, totalTurmasAtivas, eventos.length]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard da Administração</h2>
        <p className="text-sm text-slate-500 mt-1">Visão consolidada da operação escolar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {indicadores.map((item) => (
          <div key={item.id} className="glass-panel p-5 border border-slate-200/60 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</div>
              <div className="text-2xl font-bold text-slate-800">{item.valor ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-panel p-5 border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-slate-500" />
            <h3 className="text-lg font-bold text-slate-800">Próximos eventos</h3>
          </div>

          <div className="flex flex-col gap-3">
            {carregandoEventos && <div className="text-sm text-slate-500">Carregando eventos...</div>}

            {!carregandoEventos && eventos.map((evento) => {
              const dataFormatada = formatarDataEvento(evento.data);
              return (
                <div key={evento.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-slate-800 leading-none">{dataFormatada.dia}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{dataFormatada.mes}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{evento.titulo}</div>
                    <div className="text-sm text-slate-500">{evento.diaTodo ? 'Dia todo' : evento.horario}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{evento.tipo}</div>
                    {evento.local && <div className="text-xs text-slate-500 mt-0.5 truncate">{evento.local}</div>}
                    {evento.anexoUrl && (
                      <a href={evento.anexoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-0.5 inline-block truncate">
                        {evento.anexoNome || 'Ver anexo'}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {!carregandoEventos && eventos.length === 0 && (
              <div className="text-sm text-slate-500">Nenhum evento cadastrado.</div>
            )}
          </div>
        </div>

        <div className="glass-panel p-5 border border-slate-200/60">
          <div className="flex flex-col gap-3">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Megaphone size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Mensagens</h2>
                <p className="text-slate-500">Esta funcionalidade está em desenvolvimento.</p>
                <p className="text-sm text-slate-400 mt-1">Em breve você poderá se comunicar diretamente com pais, professore e direção.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
