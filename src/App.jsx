import React, { useEffect, useRef, useState } from 'react';
import { Calendar, MessageSquare, BookOpen, LogOut, Bell, User, School, Users, ChevronDown } from 'lucide-react';

import DashboardTurmasView from './views/DashboardTurmasView';
import DiarioClasseView from './views/DiarioClasseView';
import CadernetaView from './views/CadernetaView';
import CalendarioView from './views/CalendarioView';
import ComunicacaoView from './views/ComunicacaoView';
import LoginView from './views/LoginView';
import ParentDashboardView from './views/ParentDashboardView';
import AdminDashboardView from './views/AdminDashboardView';
import AdminStudentsView from './views/AdminStudentsView';
import AdminTeachersView from './views/AdminTeachersView';
import AdminGuardiansView from './views/AdminGuardiansView';
import AdminClassroomsView from './views/AdminClassroomsView';
import UserProfileView from './views/UserProfileView';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Mocks integrados
// Status possíveis: 'pending', 'draft', 'sent', 'absent'
const INITIAL_STUDENTS_STATUS = {
    '1': { id: '1', turmaId: 't1', name: 'João Pedro', status: 'draft', avatar: 'https://ui-avatars.com/api/?name=Joao+Pedro&background=e2e8f0&color=0f172a' },
    '2': { id: '2', turmaId: 't2', name: 'Maria Clara', status: 'pending', avatar: 'https://ui-avatars.com/api/?name=Maria+Clara&background=fef08a&color=854d0e' },
    '3': { id: '3', turmaId: 't2', name: 'Enzo Gabriel', status: 'pending', avatar: 'https://ui-avatars.com/api/?name=Enzo+G&background=bfdbfe&color=1e3a8a' },
    '4': { id: '4', turmaId: 't1', name: 'Sofia M.', status: 'sent', avatar: 'https://ui-avatars.com/api/?name=Sofia+M&background=fbcfe8&color=831843' },
    '5': { id: '5', turmaId: 't1', name: 'Lucas T.', status: 'pending', avatar: 'https://ui-avatars.com/api/?name=Lucas+T&background=dcfce7&color=166534' },
    '6': { id: '6', turmaId: 't1', name: 'Alice R.', status: 'pending', avatar: 'https://ui-avatars.com/api/?name=Alice+R&background=fce7f3&color=9d174d' },
};

function MainApp() {
    const { currentUser, userRole, userProfile, logout } = useAuth();

    const [activeTab, setActiveTab] = useState('caderneta'); // 'caderneta', 'calendario', 'comunicacao'

    // Controle do fluxo Aninhado de Caderneta (Role: Teacher)
    const [cadernetaStep, setCadernetaStep] = useState('dashboard');
    const [selectedTurma, setSelectedTurma] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentsStatus, setStudentsStatus] = useState(INITIAL_STUDENTS_STATUS);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    useEffect(() => {
        if (userRole === 'admin' && !activeTab.startsWith('admin-') && activeTab !== 'perfil') {
            setActiveTab('admin-dashboard');
        }
    }, [userRole, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentUser) {
        return <LoginView />;
    }

    // --- Fluxo Específico (Professor) ---
    const handleOpenTurma = (turma) => {
        setSelectedTurma(turma);
        setCadernetaStep('diario');
    };

    const handleOpenStudent = (studentId) => {
        setSelectedStudentId(studentId);
        setCadernetaStep('aluno');
    };

    const handleUpdateStudentStatus = (studentId, newStatus) => {
        setStudentsStatus(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status: newStatus }
        }));
    };

    const renderCadernetaFlow = () => {
        if (cadernetaStep === 'dashboard') {
            return <DashboardTurmasView onOpenTurma={handleOpenTurma} />;
        }
        if (cadernetaStep === 'diario' && selectedTurma) {
            return (
                <DiarioClasseView
                    turma={selectedTurma}
                    studentsStatus={studentsStatus}
                    onBack={() => setCadernetaStep('dashboard')}
                    onOpenStudent={handleOpenStudent}
                />
            );
        }
        if (cadernetaStep === 'aluno' && selectedStudentId) {
            return (
                <CadernetaView
                    student={studentsStatus[selectedStudentId]}
                    turma={selectedTurma}
                    onBack={() => setCadernetaStep('diario')}
                    onUpdateStatus={(status) => handleUpdateStudentStatus(selectedStudentId, status)}
                />
            );
        }
        return <DashboardTurmasView onOpenTurma={handleOpenTurma} />; // Fallback
    };

    // --- Roteamento Principal ---
    const renderContent = () => {
        if (activeTab === 'perfil') return <UserProfileView />;

        // Roteamento baseado no Role (Perfil)
        if (userRole === 'admin') {
            if (activeTab === 'admin-dashboard') return <AdminDashboardView />;
            if (activeTab === 'admin-professores') return <AdminTeachersView />;
            if (activeTab === 'admin-responsaveis') return <AdminGuardiansView />;
            if (activeTab === 'admin-alunos') return <AdminStudentsView />;
            if (activeTab === 'admin-turmas') return <AdminClassroomsView />;
            return <AdminStudentsView />;
        }

        if (userRole === 'parent') {
            if (activeTab === 'caderneta') return <ParentDashboardView />;
            if (activeTab === 'calendario') return <CalendarioView />;
            if (activeTab === 'comunicacao') return <ComunicacaoView />;
        }

        // Default: Teacher
        switch (activeTab) {
            case 'caderneta': return renderCadernetaFlow();
            case 'calendario': return <CalendarioView />;
            case 'comunicacao': return <ComunicacaoView />;
            default: return renderCadernetaFlow();
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setIsUserMenuOpen(false);
        if (tabId === 'caderneta') setCadernetaStep('dashboard');
    };

    const handleOpenProfile = () => {
        setActiveTab('perfil');
        setIsUserMenuOpen(false);
    };

    // O Label do menu muda dependendo da role
    const getNavLabel = () => {
        if (userRole === 'admin') return 'Visão Geral';
        if (userRole === 'parent') return 'Meu Filho';
        return 'Diário de Classe';
    };

    const navItems = userRole === 'admin'
        ? [
            { id: 'admin-dashboard', label: 'Dashboard', icon: Calendar },
            { id: 'admin-professores', label: 'Professores', icon: User },
            { id: 'admin-turmas', label: 'Turmas', icon: School },
            { id: 'admin-responsaveis', label: 'Responsáveis', icon: Users },
            { id: 'admin-alunos', label: 'Alunos', icon: BookOpen },
        ]
        : [
            { id: 'caderneta', label: getNavLabel(), icon: BookOpen },
            { id: 'calendario', label: 'Calendário', icon: Calendar },
            { id: 'comunicacao', label: 'Mensagens', icon: MessageSquare },
        ];

    const userDisplayName = userProfile?.nome || currentUser?.displayName || 'Usuário';
    const userDisplayEmail = userProfile?.email || currentUser?.email || '';
    const userAvatar = userProfile?.avatarUrl || '';

    return (
        <div className="flex h-screen overflow-hidden bg-bg-app">
            {/* Mobile Topbar */}
            <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_8px_rgba(16,185,129,0.3)]">V</div>
                    <span className="font-bold text-slate-800 tracking-tight">Verdy</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-slate-500 hover:text-primary"><Bell size={20} /></button>
                    <div onClick={logout} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 cursor-pointer">
                        <LogOut size={16} className="text-red-500" />
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[280px] bg-white border-r border-slate-200 flex-col p-6 z-10 shrink-0">
                <div className="flex items-center gap-3 mb-10 mt-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_10px_rgba(16,185,129,0.3)]">V</div>
                    <h2 className="font-bold text-2xl text-slate-800 tracking-tight">Colégio Verdy</h2>
                </div>

                <nav className="flex flex-col gap-2 flex-1 mt-4">
                    {navItems.map(item => (
                        <button key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl font-medium text-[15px] transition-all ${activeTab === item.id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                                }`}>
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col pt-16 lg:pt-0 overflow-hidden relative">
                {/* Desktop Topbar */}
                <header className="hidden lg:flex h-20 items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex ml-auto items-center gap-6">
                        <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-colors"><Bell size={20} /></button>
                        <div ref={userMenuRef} className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                className="flex items-center gap-3 select-none hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors"
                            >
                                <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500">
                                    {userAvatar ? (
                                        <img src={userAvatar} alt={userDisplayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} />
                                    )}
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="font-semibold text-sm text-slate-800 uppercase">{userDisplayName}</span>
                                    <span className="text-xs text-slate-500 truncate max-w-[180px]">{userDisplayEmail || 'Conta ativa'}</span>
                                </div>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-20">
                                    <button
                                        onClick={handleOpenProfile}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <User size={16} />
                                        Meu perfil
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut size={16} />
                                        Sair do sistema
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
                    {renderContent()}
                </div>
            </main>

            {/* Mobile Bottom Navigation Layout */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 lg:hidden pb-safe z-50">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === item.id ? 'text-primary' : 'text-slate-400'
                            }`}
                    >
                        <item.icon size={22} className={activeTab === item.id ? 'fill-primary/20' : ''} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}
