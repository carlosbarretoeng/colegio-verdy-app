import React from 'react';
import { LogOut, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboardView = () => {
    const { logout } = useAuth();

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full p-4 lg:p-8">

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Direção Escolar</h1>
                    <p className="text-sm text-slate-500 mt-1">Visão global da instituição (Em Construção)</p>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-sm font-semibold text-red-500 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
                    <LogOut size={16} /> Sair
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-8 text-center flex flex-col items-center border-dashed border-2 border-slate-200">
                    <Users size={40} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Gestão de Alunos</h3>
                </div>
                <div className="glass-panel p-8 text-center flex flex-col items-center border-dashed border-2 border-slate-200">
                    <BarChart3 size={40} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Relatórios</h3>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboardView;
