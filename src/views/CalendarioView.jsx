import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const EVENT_TYPE_COLORS = {
  Administrativos: 'bg-primary',
  Acadêmicos: 'bg-blue-500',
  Feriado: 'bg-red-400',
  Recesso: 'bg-amber-500'
};

const resolveEventColor = (type) => EVENT_TYPE_COLORS[type] || 'bg-slate-500';

const toPlainText = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const CalendarVisualization = ({ embedded = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!db) {
      setCarregandoEventos(false);
      return () => { };
    }

    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: data.titulo || 'Sem título',
          date: data.data || '',
          time: data.diaTodo ? 'Dia todo' : (data.horario || ''),
          location: data.local || 'Local não informado',
          type: data.tipo || 'Administrativos',
          color: resolveEventColor(data.tipo),
          description: toPlainText(data.descricao || ''),
          diaTodo: !!data.diaTodo
        };
      }).sort((a, b) => {
        const dataA = `${a.date || ''} ${a.time || ''}`;
        const dataB = `${b.date || ''} ${b.time || ''}`;
        return dataA.localeCompare(dataB);
      });

      setEventos(lista);
      setCarregandoEventos(false);
    }, () => {
      setEventos([]);
      setCarregandoEventos(false);
    });

    return () => unsubscribe();
  }, []);

  const eventsByDate = useMemo(() => {
    return eventos.reduce((acc, event) => {
      if (!event.date) return acc;
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {});
  }, [eventos]);

  const eventsForSelectedDate = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const openDayModal = (dateStr) => {
    setSelectedDate(dateStr);
    setModalOpen(true);
  };

  const renderCalendarDays = () => {
    const days = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 lg:h-24 bg-slate-50/50 rounded-xl border border-transparent"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEvents = eventsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate === dateStr;

      days.push(
        <div
          key={day}
          onClick={() => openDayModal(dateStr)}
          className={`relative h-12 lg:h-24 p-1 lg:p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center lg:items-start ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:border-primary/40 bg-white shadow-sm'}`}
        >
          <span className={`text-[13px] lg:text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-slate-700'}`}>
            {day}
          </span>

          <div className="flex lg:hidden gap-1 mt-1">
            {hasEvents.slice(0, 3).map((event) => (
              <div key={event.id} className={`w-1.5 h-1.5 rounded-full ${event.color}`}></div>
            ))}
          </div>

          <div className="hidden lg:flex flex-col gap-1 mt-1 w-full overflow-hidden">
            {hasEvents.slice(0, 2).map((event) => (
              <div key={event.id} className={`text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate ${event.color}`}>
                {event.diaTodo ? 'Dia todo' : event.time} - {event.title}
              </div>
            ))}
            {hasEvents.length > 2 && (
              <div className="text-[10px] text-slate-500 font-medium px-1">+ {hasEvents.length - 2} mais</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDateLabel = selectedDate ? selectedDate.split('-').reverse().join('/') : '';

  return (
    <>
      <div className={`${embedded ? 'w-full' : 'max-w-7xl mx-auto h-full'}`}>
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 h-fit shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-3">
              <CalendarIcon className="text-primary hidden sm:block" size={24} />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 lg:mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 lg:gap-2">
            {renderCalendarDays()}
          </div>

          {carregandoEventos && (
            <div className="text-sm text-slate-500 mt-3">Carregando eventos...</div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-slate-900/45" onClick={() => setModalOpen(false)} aria-label="Fechar modal" />

          <div className="relative w-full sm:max-w-2xl max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-800">Eventos de {selectedDateLabel}</h3>
              <button onClick={() => setModalOpen(false)} className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[68vh] flex flex-col gap-3 pr-1">
              {eventsForSelectedDate.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-100 p-4">
                  Nenhum evento cadastrado para este dia.
                </div>
              ) : (
                eventsForSelectedDate.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-3 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.color}`}></div>
                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="font-semibold text-slate-800">{event.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide text-white ${event.color}`}>{event.type}</span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-500 mb-2">{event.description}</p>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <Clock size={14} className="text-slate-400" /> {event.time || 'Horário não informado'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <MapPin size={14} className="text-slate-400" /> {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CalendarioView = () => <CalendarVisualization />;

export default CalendarioView;
