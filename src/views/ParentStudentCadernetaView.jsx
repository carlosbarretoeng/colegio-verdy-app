import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Edit3,
  Moon,
  UserX,
} from 'lucide-react';

/* ────────────────────────────────────────────
   Helpers de exibição
──────────────────────────────────────────── */
const ValueBadge = ({ value }) => {
  if (!value) return <span className="text-xs text-slate-400 italic">—</span>;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
      {value}
    </span>
  );
};

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="glass-panel flex-1">
    <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
      <Icon className="text-primary" size={20} /> {title}
    </div>
    {children}
  </div>
);

const RowItem = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-600">{label}</span>
    <ValueBadge value={value} />
  </div>
);

/* ────────────────────────────────────────────
   Data formatada: "seg., 23 fev. 2026"
──────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];

/* ────────────────────────────────────────────
   View principal
──────────────────────────────────────────── */
const ParentStudentCadernetaView = ({ student, turmasMap, onBack }) => {
  const [entriesByTurma, setEntriesByTurma] = useState({}); // turmaId -> entries
  const [selectedTurmaId, setSelectedTurmaId] = useState(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Carrega histórico de cadernetas por turma
  useEffect(() => {
    if (!db || !student?.id) { setLoading(false); return; }

    const turmaIds = Array.isArray(student.turmaIds) && student.turmaIds.length > 0
      ? student.turmaIds
      : student.turmaId ? [student.turmaId] : [];

    if (turmaIds.length === 0) { setLoading(false); return; }

    Promise.all(
      turmaIds.map(async (turmaId) => {
        const snap = await getDocs(
          query(
            collection(db, 'cadernetaEntries'),
            where('studentId', '==', student.id),
            where('turmaId', '==', turmaId),
            orderBy('date', 'desc')
          )
        );
        return { turmaId, entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
      })
    ).then((results) => {
      const map = {};
      results.forEach(({ turmaId, entries }) => { map[turmaId] = entries; });
      setEntriesByTurma(map);
      // Seleciona a primeira turma por padrão
      setSelectedTurmaId(turmaIds[0]);
      setIndex(0);
      setLoading(false);
    });
  }, [student?.id]);

  const entries = selectedTurmaId ? entriesByTurma[selectedTurmaId] || [] : [];
  const entry    = entries[index] ?? null;
  const formData = entry?.data ?? null;
  const absent   = entry?.isAbsent ?? false;

  const canPrev = index < entries.length - 1;
  const canNext = index > 0;

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 lg:p-8">

      {/* ── Header ── */}
      <div className="glass-panel !p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Identidade do aluno */}
        <div className="flex items-center gap-3">

          <div>
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary transition-colors bg-white shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className='flex-1'>
            <div className='flex flex-col items-center'>
              <div className="font-bold text-lg text-slate-800">{student.nome}</div>
              {/* Se múltiplas turmas, mostra seleção */}
              {Array.isArray(student.turmaIds) && student.turmaIds.length > 1 ? (
                <select
                  className="text-xs font-medium text-slate-500 uppercase tracking-widest bg-transparent border-none outline-none"
                  value={selectedTurmaId || ''}
                  onChange={e => { setSelectedTurmaId(e.target.value); setIndex(0); }}
                >
                  {student.turmaIds.map((tid) => (
                    <option key={tid} value={tid}>{turmasMap?.[tid] || 'Turma não informada'}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">{turmasMap?.[selectedTurmaId] || 'Turma não informada'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Navegação de datas */}
        {!loading && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <button
              onClick={() => setIndex((i) => i + 1)}
              disabled={!canPrev}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Data anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-semibold text-slate-700 min-w-[160px] text-center">
              {entry
                ? isToday(entry.date)
                  ? 'Hoje · ' + formatDate(entry.date)
                  : formatDate(entry.date)
                : 'Nenhuma entrada'}
            </span>

            <button
              onClick={() => setIndex((i) => i - 1)}
              disabled={!canNext}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Próxima data"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="glass-panel animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* ── Sem histórico ── */}
      {!loading && entries.length === 0 && (
        <div className="glass-panel p-10 text-center">
          <Edit3 size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">Nenhuma caderneta registrada</p>
          <p className="text-sm text-slate-400 mt-1">As cadernetas aparecerão aqui após serem enviadas pela escola.</p>
        </div>
      )}

      {/* ── Falta registrada ── */}
      {!loading && entry && absent && (
        <div className="glass-panel bg-red-50/80 border-red-200 flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
            <UserX size={24} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-red-700">Falta registrada</p>
            <p className="text-sm text-red-500 mt-0.5">{student.nome} não compareceu neste dia.</p>
          </div>
        </div>
      )}

      {/* ── Conteúdo da caderneta ── */}
      {!loading && entry && !absent && formData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Refeições */}
          <SectionCard icon={Coffee} title="Refeições">
            {Object.entries(formData.meals ?? {}).map(([meal, val]) => (
              <RowItem key={meal} label={meal} value={val} />
            ))}
          </SectionCard>

          {/* Descanso */}
          <SectionCard icon={Moon} title="Descanso">
            {Object.entries(formData.rest ?? {}).map(([item, val]) => (
              <RowItem key={item} label={item} value={val} />
            ))}
          </SectionCard>

          {/* Atividades + Evacuação */}
          <div className="glass-panel lg:col-span-full flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                <Activity className="text-primary" size={20} /> Atividades
              </div>
              {['Manhã', 'Tarde'].map((p) => (
                <RowItem key={p} label={p} value={formData.activities?.[p]} />
              ))}
            </div>

            <div className="hidden lg:block w-px bg-slate-200" />

            <div className="flex-1">
              <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                <CheckCircle className="text-primary" size={20} /> Evacuação
              </div>
              {['Manhã', 'Tarde'].map((p) => (
                <RowItem key={p} label={p} value={formData.evacuation?.[p]} />
              ))}
            </div>
          </div>

          {/* Observações */}
          <SectionCard icon={Edit3} title="Observações e Recados" className="flex-1">
            {formData.obs
            ? <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{formData.obs}</p>
            : <p className="text-sm text-slate-400 italic">Nenhuma observação registrada.</p>
            }
            </SectionCard>
        </div>
      )}
    </div>
  );
};

export default ParentStudentCadernetaView;
