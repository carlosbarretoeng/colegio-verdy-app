import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const DIAS = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca',   label: 'Terça-feira'   },
    { key: 'quarta',  label: 'Quarta-feira'  },
    { key: 'quinta',  label: 'Quinta-feira'  },
    { key: 'sexta',   label: 'Sexta-feira'   },
];

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_LONGOS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

/** Serializa um Date usando hora local (evita desvio de fuso em toISOString). */
function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayStr(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return toLocalDateStr(d);
}

function addWeeks(mondayStr, n) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + n * 7);
    return toLocalDateStr(d);
}

function weekDayDate(mondayStr, index) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + index);
    return d;
}

function formatWeekRange(mondayStr) {
    const start = new Date(mondayStr + 'T00:00:00');
    const end   = new Date(mondayStr + 'T00:00:00');
    end.setDate(end.getDate() + 4);
    const s = `${String(start.getDate()).padStart(2,'0')} ${MESES_CURTOS[start.getMonth()]}`;
    const e = `${String(end.getDate()).padStart(2,'0')} ${MESES_CURTOS[end.getMonth()]} ${end.getFullYear()}`;
    return `${s} – ${e}`;
}

function getTodayKey() {
    const day = new Date().getDay();
    return ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][day] ?? null;
}

export default function MerendaView() {
    const [semana, setSemana] = useState(() => getMondayStr(new Date()));
    const [cardapio, setCardapio] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const isCurrentWeek = semana === getMondayStr(new Date());
    const todayKey = isCurrentWeek ? getTodayKey() : null;

    useEffect(() => {
        if (!db) return;
        setCarregando(true);
        getDoc(doc(db, 'merendaSemanal', `semana_${semana}`))
            .then(snap => setCardapio(snap.exists() ? snap.data() : null))
            .catch(() => setCardapio(null))
            .finally(() => setCarregando(false));
    }, [semana]);

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed size={20} className="text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Cardápio Semanal</h1>
                    <p className="text-sm text-slate-500">Cardápio da escola</p>
                </div>
            </div>

            {/* Navegação de semana */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 shadow-sm">
                <button
                    onClick={() => setSemana(s => addWeeks(s, -1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="text-center">
                    <span className="text-sm font-semibold text-slate-800">{formatWeekRange(semana)}</span>
                    {isCurrentWeek && (
                        <span className="ml-2 text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            Esta semana
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setSemana(s => addWeeks(s, 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Conteúdo */}
            {carregando ? (
                <div className="space-y-3">
                    {DIAS.map(d => (
                        <div key={d.key} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                            <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                        </div>
                    ))}
                </div>
            ) : !cardapio ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <UtensilsCrossed size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">Cardápio não cadastrado</p>
                    <p className="text-sm text-slate-400 mt-1">O cardápio desta semana ainda não foi publicado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {DIAS.map((dia, i) => {
                        const date = weekDayDate(semana, i);
                        const diaStr = `${DIAS_ABREV[date.getDay()]}, ${String(date.getDate()).padStart(2,'0')} de ${MESES_LONGOS[date.getMonth()]}`;
                        const isToday = dia.key === todayKey;
                        const descricao = cardapio[dia.key] || '';
                        return (
                            <div
                                key={dia.key}
                                className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${isToday ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-slate-700'}`}>
                                        {dia.label}
                                        {isToday && (
                                            <span className="ml-2 text-[10px] font-medium bg-primary text-white rounded-full px-1.5 py-0.5 align-middle">
                                                Hoje
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs text-slate-400">{diaStr}</span>
                                </div>
                                {descricao ? (
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{descricao}</p>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Sem cardápio informado</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
