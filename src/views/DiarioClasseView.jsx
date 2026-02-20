import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock, UserX, Search } from 'lucide-react';

const DiarioClasseView = ({ turma, onBack, onOpenStudent, studentsStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtra estudantes da turma mockada (Idealmente os deents viriam nas props integradas à Turma)
    // Como é MVP UI, garantimos que listamos as chaves iteráveis em `studentsStatus`
    const studentsList = Object.values(studentsStatus).filter(s => s.turmaId === turma.id);

    const filteredList = studentsList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getStatusIconInfo = (status) => {
        switch (status) {
            case 'sent': return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Enviado' };
            case 'draft': return { icon: Clock, color: 'text-accent', bg: 'bg-accent/10', label: 'Pendente (Rascunho)' };
            case 'absent': return { icon: UserX, color: 'text-red-500', bg: 'bg-red-50', label: 'Faltou' };
            default: return { icon: Circle, color: 'text-slate-300', bg: 'bg-slate-50', label: 'Não iniciado' };
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2 lg:mb-6 flex-wrap">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-[200px]">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 truncate">Diário de Classe</h1>
                    <p className="text-sm font-medium text-primary mt-1">{turma.nome} ({turma.periodo})</p>
                </div>
            </div>

            {/* Caixa de Busca */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar aluno na turma..."
                    className="form-control !pl-10 !py-3 bg-white shadow-sm border-transparent"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Lista de Alunos (Diário) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>{filteredList.length} Alunos</span>
                    <span>Status de Envio</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredList.map(student => {
                        const statusInfo = getStatusIconInfo(student.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div
                                key={student.id}
                                onClick={() => onOpenStudent(student.id)}
                                className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0 relative">
                                        <img src={student.avatar} alt={student.name} className={`w-full h-full rounded-full object-cover ${student.status === 'absent' ? 'grayscale opacity-60' : ''}`} />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-[15px] ${student.status === 'absent' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                            {student.name}
                                        </h4>
                                        <span className="text-xs text-slate-400">Ver diário</span>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.bg}`}>
                                    <StatusIcon size={16} className={statusInfo.color} />
                                    <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                                </div>
                            </div>
                        );
                    })}

                    {filteredList.length === 0 && (
                        <div className="p-10 flex flex-col items-center justify-center text-slate-400 text-center">
                            <UserX size={48} className="mb-4 text-slate-300" />
                            Nenhum aluno encontrado correspondente à busca.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiarioClasseView;
