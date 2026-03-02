import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CalendarVisualization } from './CalendarioView';
import ParentStudentCadernetaView from './ParentStudentCadernetaView';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';

const statusConfig = {
  sent:    { label: 'Enviada hoje',     className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  absent:  { label: 'Falta registrada', className: 'bg-red-50 text-red-600 border-red-200' },
  pending: { label: 'Aguardando',       className: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const StudentCard = ({ student, turmaNome, cadernetaStatus, onClick }) => {
  const cfg = statusConfig[cadernetaStatus] ?? statusConfig.pending;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all text-left"
    >
      <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
        {student.fotoUrl
          ? <img src={student.fotoUrl} alt={student.nome} className="w-full h-full object-cover" />
          : <span className="text-lg font-bold text-slate-400">{student.nome?.charAt(0)?.toUpperCase()}</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{student.nome}</p>
        <p className="text-sm text-slate-500 mt-0.5">{turmaNome || 'Turma não informada'}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
          {cfg.label}
        </span>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </button>
  );
};

const ParentDashboardView = () => {
  const { currentUser, userProfile } = useAuth();

  const [students, setStudents]         = useState([]);
  const [turmasMap, setTurmasMap]       = useState({}); // turmaId → nome
  const [todayEntries, setTodayEntries] = useState({}); // studentId → status
  const [loading, setLoading]           = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null); // student selecionado para ver caderneta

  const uid = currentUser?.uid;

  // 1. Alunos vinculados a este responsável
  useEffect(() => {
    if (!db || !uid) { setLoading(false); return undefined; }

    const q = query(
      collection(db, 'students'),
      where('responsaveisIds', 'array-contains', uid)
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.status === 'ativo');
        setStudents(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [uid]);

  // 2. Nomes das turmas
  useEffect(() => {
    if (!db || students.length === 0) { setTurmasMap({}); return undefined; }

    const turmaIds = [...new Set(students.map((s) => s.turmaId).filter(Boolean))];
    if (turmaIds.length === 0) return undefined;

    const q = query(collection(db, 'classrooms'), where('__name__', 'in', turmaIds));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data().nome || 'Turma'; });
      setTurmasMap(map);
    }, () => {});

    return unsub;
  }, [students]);

  // 3. Cadernetas de hoje
  useEffect(() => {
    if (!db || students.length === 0) { setTodayEntries({}); return undefined; }

    const _td = new Date();
    const todayDate = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
    const studentIds = students.map((s) => s.id);
    const chunks = [];
    for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30));

    const unsubscribers = chunks.map((chunk) => {
      const q = query(
        collection(db, 'cadernetaEntries'),
        where('studentId', 'in', chunk),
        where('date', '==', todayDate)
      );
      return onSnapshot(q, (snap) => {
        setTodayEntries((prev) => {
          const next = { ...prev };
          snap.docs.forEach((d) => { const e = d.data(); next[e.studentId] = e.status || 'pending'; });
          return next;
        });
      }, () => {});
    });

    return () => unsubscribers.forEach((u) => u());
  }, [students]);

  const nomePrimeiro = userProfile?.nome?.split(' ')[0] || 'Responsável';

  // Navega para a view de caderneta de um aluno específico
  if (selectedStudent) {
    return (
      <ParentStudentCadernetaView
        student={selectedStudent}
        turmaNome={turmasMap[selectedStudent.turmaId]}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 lg:p-8">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Olá, {nomePrimeiro}!</h1>
      </div>

      {/* Calendário Escolar */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-slate-700">Calendário Escolar</h2>
        </div>
        <CalendarVisualization embedded />
      </section>

      {/* Meus Filhos */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-slate-700">Meus Filhos</h2>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((k) => (
              <div key={k} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Clock size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Nenhum aluno vinculado</p>
            <p className="text-sm text-slate-400 mt-1">
              Entre em contato com a escola para vincular seu filho à sua conta.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                turmaNome={turmasMap[student.turmaId]}
                cadernetaStatus={todayEntries[student.id] || 'pending'}
                onClick={() => setSelectedStudent(student)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default ParentDashboardView;
