import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CalendarVisualization } from './CalendarioView';

const TeacherDashboard = ({ onOpenTurma, turmas = [], studentsStatus = {}, carregando = false }) => {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-4">Minhas Turmas { turmas.length > 0 ? `(${turmas.length})` : '' }</h2>
                {carregando ? (
                    <p className="text-slate-500">Carregando turmas...</p>
                ) : turmas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {turmas.map((turma) => {
                            const turmaStudents = Object.values(studentsStatus).filter(
                                (student) => student.turmaId === turma.id
                            );
                            const countStudents = turmaStudents.length;
                            const countFilled = turmaStudents.filter(s => s.status === 'sent' || s.status === 'absent').length;

                            return (
                                <div
                                    key={turma.id}
                                    onClick={() => onOpenTurma(turma)}
                                    className="p-4 rounded-lg border-2 border-slate-200 hover:border-primary/50 bg-white cursor-pointer transition-all hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-slate-800">{turma.nome}</h3>
                                        <ChevronRight size={18} className="text-slate-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-slate-600">{turma.periodo}</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">Cadernetas preenchidas</span>
                                                <span className="font-semibold text-primary">{countFilled}/{countStudents}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${countStudents > 0 ? (countFilled / countStudents) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-500">Nenhuma turma atribuída</p>
                )}
            </div>

            {/* Calendar Section */}
            <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-4">Calendário Escolar</h2>
                <CalendarVisualization embedded />
            </div>
        </div>
    );
};

export default TeacherDashboard;
