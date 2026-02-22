import React from 'react';
import { LogOut, ArrowRight, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ParentDashboardView = () => {
    const { logout } = useAuth();

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full p-4 lg:p-8">

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Painel do Responsável</h1>
                    <p className="text-sm text-slate-500 mt-1">Acompanhe a rotina dos seus filhos (Em Construção)</p>
                </div>
            </div>

            <div className="glass-panel p-8 text-center flex flex-col items-center justify-center h-64 border-dashed border-2 border-slate-200">
                <FileText size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Área em Desenvolvimento</h3>
                <p className="text-slate-500 max-w-md">Aqui os pais verão um resumo da última caderneta enviada, avisos urgentes da escola e atalhos rápidos.</p>
            </div>

        </div>
    );
};

export default ParentDashboardView;
