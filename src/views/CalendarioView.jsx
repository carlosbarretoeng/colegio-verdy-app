import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Calendar as CalendarIcon, Filter } from 'lucide-react';

const MOCK_EVENTS = [
    { id: '1', title: 'Festa Junina', date: '2024-06-24', time: '14:00 - 18:00', location: 'Pátio Principal', type: 'Festa', color: 'bg-orange-500', participants: 'Todas as Turmas', description: 'Nossa tradicional festa junina com comidas típicas e danças.' },
    { id: '2', title: 'Reunião de Pais', date: '2024-06-15', time: '19:00 - 21:00', location: 'Auditório', type: 'Institucional', color: 'bg-primary', participants: 'Berçário e Maternal', description: 'Apresentação do fechamento de semestre e novas metodologias.' },
    { id: '3', title: 'Passeio ao Zoológico', date: '2024-06-10', time: '08:00 - 12:00', location: 'Zoológico Municipal', type: 'Excursão', color: 'bg-blue-500', participants: 'Ensino Fundamental I', description: 'Alunos devem vir com agasalho leve e trazer cantil de água.' },
    { id: '4', title: 'Vacinação (Gripe)', date: '2024-06-05', time: '09:00 - 16:00', location: 'Enfermaria', type: 'Saúde', color: 'bg-red-400', participants: 'Todas as Turmas', description: 'Campanha interna de vacinação. Trazer carteirinha!' },
];

const CalendarioView = () => {
    const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 1)); // Junho 2024 (Mock)
    const [selectedDate, setSelectedDate] = useState(null);
    const [filterType, setFilterType] = useState('Todos');

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Função super simples pra gerar a grid do calendário
    const renderCalendarDays = () => {
        const days = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // Espaços vazios no começo do mês
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 lg:h-24 bg-slate-50/50 rounded-xl border border-transparent"></div>);
        }

        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvents = MOCK_EVENTS.filter(e => e.date === dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative h-12 lg:h-24 p-1 lg:p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center lg:items-start
             ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:border-primary/40 bg-white shadow-sm'}
           `}
                >
                    <span className={`text-[13px] lg:text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
             ${isToday ? 'bg-primary text-white' : 'text-slate-700'}
           `}>
                        {day}
                    </span>

                    {/* Bolinhas de Evento no Mobile */}
                    <div className="flex lg:hidden gap-1 mt-1">
                        {hasEvents.slice(0, 3).map(ev => (
                            <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${ev.color}`}></div>
                        ))}
                    </div>

                    {/* Tags de Evento no Desktop */}
                    <div className="hidden lg:flex flex-col gap-1 mt-1 w-full overflow-hidden">
                        {hasEvents.slice(0, 2).map(ev => (
                            <div key={ev.id} className={`text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate ${ev.color}`}>
                                {ev.time.split(' ')[0]} - {ev.title}
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

    const filteredEvents = MOCK_EVENTS.filter(ev => {
        // Filtro por Data Selecionada
        if (selectedDate && ev.date !== selectedDate) return false;
        // Filtro por Tipo
        if (filterType !== 'Todos' && ev.type !== filterType) return false;

        // Mostra apenas eventos do mês atual (se nenhuma data especifica for selecionada)
        if (!selectedDate) {
            const evMonth = parseInt(ev.date.split('-')[1], 10) - 1;
            const evYear = parseInt(ev.date.split('-')[0], 10);
            if (evMonth !== currentDate.getMonth() || evYear !== currentDate.getFullYear()) return false;
        }
        return true;
    });

    return (
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full">

            {/* Esquerda: O Calendário Visual */}
            <div className="flex-[2] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 h-fit shrink-0">

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

                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 gap-2 mb-2 lg:mb-4">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid de Dias */}
                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                    {renderCalendarDays()}
                </div>
            </div>

            {/* Direita: Lista de Eventos do Mês/Dia */}
            <div className="flex-1 flex flex-col gap-4">

                <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-bold text-slate-800">
                        {selectedDate ? `Eventos de ${selectedDate.split('-').reverse().join('/')}` : 'Próximos Eventos'}
                    </h3>
                    <button className="hidden lg:flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors bg-primary/10 px-3 py-1.5 rounded-lg">
                        <Plus size={16} /> Novo Evento
                    </button>
                </div>

                {/* Pílulas de Filtro Rápido */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                    {['Todos', 'Institucional', 'Festa', 'Excursão'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border
                  ${filterType === type ? 'bg-slate-800 text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}
                `}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-20 lg:pb-0 flex flex-col gap-3">
                    {filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-center bg-slate-50 rounded-2xl border border-slate-100/50 h-40">
                            <CalendarIcon size={40} className="mb-3 text-slate-300" />
                            Nenhum evento programado para esta seleção.
                        </div>
                    ) : (
                        filteredEvents.map(event => (
                            <div key={event.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${event.color}`}></div>

                                <div className="p-4 pl-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide text-white ${event.color}`}>{event.type}</span>
                                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{event.date.split('-').reverse().join('/')}</span>
                                    </div>

                                    <h4 className="font-bold text-slate-800 text-lg mb-1">{event.title}</h4>
                                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{event.description}</p>

                                    <div className="flex flex-col gap-1.5 mt-auto">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Clock size={14} className="text-slate-400" /> {event.time}
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

                {/* Mobile Add Button Floating */}
                <button className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-[0_8px_16px_rgba(16,185,129,0.3)] flex items-center justify-center hover:-translate-y-1 transition-transform z-40">
                    <Plus size={24} />
                </button>

            </div>
        </div>
    );
};

export default CalendarioView;
