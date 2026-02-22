import React from 'react';
import { Users, BookOpen, ChevronRight, Clock } from 'lucide-react';

const COLORS = ['from-emerald-400 to-emerald-600', 'from-blue-400 to-blue-600', 'from-indigo-400 to-indigo-600', 'from-amber-400 to-amber-600'];

const TeacherDashboard = ({ onOpenTurma, turmas = [], studentsStatus = {}, carregando = false }) => {
    const studentsByTurma = Object.values(studentsStatus).reduce((acc, student) => {
        const turmaId = student.turmaId;
        if (!turmaId) return acc;
        if (!acc[turmaId]) acc[turmaId] = [];
        acc[turmaId].push(student);
        return acc;
    }, {});

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full">
            <div className="mb-2 lg:mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Dashboard do Professor</h1>
                <p className="text-sm text-slate-500 mt-1">Selecione uma turma para preencher as cadernetas de hoje.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {carregando && (
                    <div className="text-sm text-slate-500">Carregando turmas...</div>
                )}

                {!carregando && turmas.map((turma, index) => {
                    const alunosTurma = studentsByTurma[turma.id] || [];
                    const totalAlunos = alunosTurma.length;
                    const preenchidas = alunosTurma.filter((student) => student.status === 'sent' || student.status === 'absent').length;
                    const isComplete = totalAlunos > 0 && preenchidas === totalAlunos;
                    const progresso = totalAlunos > 0 ? (preenchidas / totalAlunos) * 100 : 0;
                    const cor = COLORS[index % COLORS.length];

                    return (
                        <div
                            key={turma.id}
                            onClick={() => onOpenTurma(turma)}
                            className="glass-panel cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg group flex flex-col gap-4 relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${cor}`}></div>

                            <div className="flex justify-between items-start">
                                <div className="pl-2">
                                    <div className="text-xs font-semibold text-primary mb-1 tracking-wide uppercase">{turma.periodo}</div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Users size={20} className="text-slate-400" /> {turma.nome}
                                    </h3>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <ChevronRight size={20} />
                                </div>
                            </div>

                            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <BookOpen size={16} /> Diários Preenchidos
                                    </span>
                                    <span className={`font-bold ${isComplete ? 'text-primary' : 'text-slate-700'}`}>
                                        {preenchidas} / {totalAlunos}
                                    </span>
                                </div>

                                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-primary' : 'bg-accent'}`}
                                        style={{ width: `${progresso}%` }}
                                    ></div>
                                </div>

                                {!isComplete && (
                                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <Clock size={14} className="text-accent" /> Faltam {Math.max(0, totalAlunos - preenchidas)} cadernetas para enviar hoje.
                                    </div>
                                )}
                                {isComplete && (
                                    <div className="text-xs text-primary-dark font-medium mt-2 flex items-center gap-1">
                                        🎉 Todas as cadernetas enviadas!
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {!carregando && turmas.length === 0 && (
                    <div className="text-sm text-slate-500">Nenhuma turma vinculada ao seu perfil.</div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
