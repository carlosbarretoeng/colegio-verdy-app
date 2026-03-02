import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, UtensilsCrossed } from 'lucide-react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const DIAS = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca',   label: 'Terça-feira'   },
    { key: 'quarta',  label: 'Quarta-feira'  },
    { key: 'quinta',  label: 'Quinta-feira'  },
    { key: 'sexta',   label: 'Sexta-feira'   },
];

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Serializa um Date usando hora local (evita desvio de fuso em toISOString). */
function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Retorna a string YYYY-MM-DD da segunda-feira da semana de `date`. */
function getMondayStr(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return toLocalDateStr(d);
}

/** Adiciona `n` semanas a uma string YYYY-MM-DD. */
function addWeeks(mondayStr, n) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + n * 7);
    return toLocalDateStr(d);
}

/** Retorna a data do dia `index` (0=Seg … 4=Sex) da semana que começa em `mondayStr`. */
function weekDayDate(mondayStr, index) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + index);
    return d;
}

function formatWeekRange(mondayStr) {
    const start = new Date(mondayStr + 'T00:00:00');
    const end   = new Date(mondayStr + 'T00:00:00');
    end.setDate(end.getDate() + 4);
    const s = `${String(start.getDate()).padStart(2,'0')} ${MESES[start.getMonth()]}`;
    const e = `${String(end.getDate()).padStart(2,'0')} ${MESES[end.getMonth()]} ${end.getFullYear()}`;
    return `${s} – ${e}`;
}

const emptyForm = () => ({ segunda: '', terca: '', quarta: '', quinta: '', sexta: '' });

export default function AdminMerendaView() {
    const { currentUser } = useAuth();
    const [semana, setSemana] = useState(() => getMondayStr(new Date()));
    const [form, setForm] = useState(emptyForm());
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [docId, setDocId] = useState(null);

    useEffect(() => {
        if (!db) return;
        setCarregando(true);
        const id = `semana_${semana}`;
        getDoc(doc(db, 'merendaSemanal', id)).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setForm({
                    segunda: data.segunda || '',
                    terca:   data.terca   || '',
                    quarta:  data.quarta  || '',
                    quinta:  data.quinta  || '',
                    sexta:   data.sexta   || '',
                });
                setDocId(id);
            } else {
                setForm(emptyForm());
                setDocId(null);
            }
        }).catch(() => {
            setForm(emptyForm());
            setDocId(null);
        }).finally(() => setCarregando(false));
    }, [semana]);

    const handleSalvar = async () => {
        if (!db) return;
        setSalvando(true);
        try {
            const id = `semana_${semana}`;
            await setDoc(doc(db, 'merendaSemanal', id), {
                semanaInicio: semana,
                segunda: form.segunda.trim(),
                terca:   form.terca.trim(),
                quarta:  form.quarta.trim(),
                quinta:  form.quinta.trim(),
                sexta:   form.sexta.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.uid || '',
            });
            setDocId(id);
            toast.success('Cardápio salvo com sucesso!');
        } catch (err) {
            toast.error('Erro ao salvar cardápio. Tente novamente.');
            console.error(err);
        } finally {
            setSalvando(false);
        }
    };

    const isCurrentWeek = semana === getMondayStr(new Date());

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed size={20} className="text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Cardápio Semanal</h1>
                    <p className="text-sm text-slate-500">Cadastre o cardápio para cada dia da semana</p>
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
                            Semana atual
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

            {/* Formulário */}
            {carregando ? (
                <div className="space-y-4">
                    {DIAS.map(d => (
                        <div key={d.key} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                            <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                            <div className="h-20 bg-slate-100 rounded-lg" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {DIAS.map((dia, i) => {
                        const date = weekDayDate(semana, i);
                        const diaStr = `${DIAS_ABREV[date.getDay()]}, ${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
                        return (
                            <div key={dia.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <label className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold text-slate-700">{dia.label}</span>
                                    <span className="text-xs text-slate-400">{diaStr}</span>
                                </label>
                                <textarea
                                    value={form[dia.key]}
                                    onChange={e => setForm(prev => ({ ...prev, [dia.key]: e.target.value }))}
                                    placeholder="Descreva o cardápio do dia..."
                                    rows={3}
                                    className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botão salvar */}
            {!carregando && (
                <div className="mt-6">
                    <button
                        onClick={handleSalvar}
                        disabled={salvando}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <Save size={16} />
                        {salvando ? 'Salvando...' : 'Salvar cardápio'}
                    </button>
                    {docId && (
                        <p className="mt-2 text-xs text-slate-400">Cardápio já registrado para esta semana — salvar irá sobrescrever.</p>
                    )}
                </div>
            )}
        </div>
    );
}
