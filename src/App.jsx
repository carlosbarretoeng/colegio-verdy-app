import React, { useEffect, useRef, useState } from 'react';
import { Calendar, MessageSquare, BookOpen, LogOut, Bell, User, School, Users, ChevronDown, Menu, X } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

import TeacherDashboard from './views/TeacherDashboard';
import DiarioClasseView from './views/DiarioClasseView';
import CadernetaView from './views/CadernetaView';
import CalendarioView from './views/CalendarioView';
import ComunicacaoView from './views/ComunicacaoView';
import LoginView from './views/LoginView';
import ParentDashboardView from './views/ParentDashboardView';
import AdminDashboardView from './views/AdminDashboardView';
import AdminCalendarView from './views/AdminCalendarView';
import AdminStudentsView from './views/AdminStudentsView';
import AdminTeachersView from './views/AdminTeachersView';
import AdminGuardiansView from './views/AdminGuardiansView';
import AdminClassroomsView from './views/AdminClassroomsView';
import UserProfileView from './views/UserProfileView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './config/firebase';

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

const EMPTY_TEACHER_CLASSROOMS = [];

function MainApp() {
    const { currentUser, userRole, userProfile, logout } = useAuth();

    const [activeTab, setActiveTab] = useState('caderneta'); // 'caderneta', 'calendario', 'comunicacao'

    // Controle do fluxo Aninhado de Caderneta (Role: Teacher)
    const [cadernetaStep, setCadernetaStep] = useState('dashboard');
    const [selectedTurma, setSelectedTurma] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentsStatus, setStudentsStatus] = useState(INITIAL_STUDENTS_STATUS);
    const [teacherClassrooms, setTeacherClassrooms] = useState(EMPTY_TEACHER_CLASSROOMS);
    const [loadingTeacherData, setLoadingTeacherData] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(() => (navigator.onLine ? 'online' : 'offline'));
    const userMenuRef = useRef(null);
    const syncTimeoutRef = useRef(null);

    useEffect(() => {
        if (userRole === 'admin' && !activeTab.startsWith('admin-') && activeTab !== 'perfil') {
            setActiveTab('admin-dashboard');
        }
    }, [userRole, activeTab]);

    useEffect(() => {
        if (!db || userRole !== 'teacher' || !currentUser?.uid) {
            if (userRole !== 'teacher') {
                setTeacherClassrooms(EMPTY_TEACHER_CLASSROOMS);
                setStudentsStatus(INITIAL_STUDENTS_STATUS);
            }
            setLoadingTeacherData(false);
            return () => { };
        }

        setLoadingTeacherData(true);

        const classroomsQuery = query(collection(db, 'classrooms'), where('professorId', '==', currentUser.uid));
        const unsubscribeClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            const lista = snapshot.docs.map((item) => {
                const data = item.data();
                return {
                    id: item.id,
                    nome: data.nome || 'Sem nome',
                    periodo: data.periodo || '',
                };
            }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

            setTeacherClassrooms(lista);
        }, () => {
            setTeacherClassrooms(EMPTY_TEACHER_CLASSROOMS);
        });

        const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
            const mapa = {};

            snapshot.docs.forEach((item) => {
                const data = item.data();
                mapa[item.id] = {
                    id: item.id,
                    turmaId: data.turmaId || '',
                    name: data.nome || 'Sem nome',
                    status: data.cadernetaStatus || 'pending',
                    avatar: data.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nome || 'Aluno')}&background=e2e8f0&color=0f172a`
                };
            });

            setStudentsStatus(mapa);
            setLoadingTeacherData(false);
        }, () => {
            setStudentsStatus({});
            setLoadingTeacherData(false);
        });

        return () => {
            unsubscribeClassrooms();
            unsubscribeStudents();
        };
    }, [userRole, currentUser?.uid]);

    useEffect(() => {
        if (userRole !== 'teacher') return;

        const allowedTurmaIds = new Set(teacherClassrooms.map((turma) => turma.id));
        setStudentsStatus((prev) => {
            const filtered = Object.values(prev).filter((student) => allowedTurmaIds.has(student.turmaId));
            return filtered.reduce((acc, student) => {
                acc[student.id] = student;
                return acc;
            }, {});
        });
    }, [teacherClassrooms, userRole]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setConnectionStatus('syncing');
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => {
                setConnectionStatus('online');
            }, 1500);
        };

        const handleOffline = () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            setConnectionStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
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

        if (!db || !studentId) return;
        updateDoc(doc(db, 'students', studentId), { cadernetaStatus: newStatus }).catch(() => { });
    };

    const renderCadernetaFlow = () => {
        if (cadernetaStep === 'dashboard') {
            return (
                <TeacherDashboard
                    onOpenTurma={handleOpenTurma}
                    turmas={teacherClassrooms}
                    studentsStatus={studentsStatus}
                    carregando={loadingTeacherData}
                />
            );
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
        return (
            <TeacherDashboard
                onOpenTurma={handleOpenTurma}
                turmas={teacherClassrooms}
                studentsStatus={studentsStatus}
                carregando={loadingTeacherData}
            />
        ); // Fallback
    };

    // --- Roteamento Principal ---
    const renderContent = () => {
        if (activeTab === 'perfil') return <UserProfileView />;

        // Roteamento baseado no Role (Perfil)
        if (userRole === 'admin') {
            if (activeTab === 'admin-dashboard') return <AdminDashboardView />;
            if (activeTab === 'admin-calendar') return <AdminCalendarView />;
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
        setIsMobileDrawerOpen(false);
        if (tabId === 'caderneta') setCadernetaStep('dashboard');
    };

    const handleOpenProfile = () => {
        setActiveTab('perfil');
        setIsUserMenuOpen(false);
        setIsMobileDrawerOpen(false);
    };

    // O Label do menu muda dependendo da role
    const getNavLabel = () => {
        if (userRole === 'admin') return 'Visão Geral';
        if (userRole === 'parent') return 'Meu Filho';
        return 'Dashboard';
    };

    const navItems = userRole === 'admin'
        ? [
            { id: 'admin-dashboard', label: 'Dashboard', icon: Calendar },
            { id: 'admin-calendar', label: 'Calendário', icon: Calendar },
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

    const connectionConfig = connectionStatus === 'offline'
        ? { label: 'Offline', className: 'bg-red-50 text-red-600 border-red-200', dotClassName: 'bg-red-500' }
        : connectionStatus === 'syncing'
            ? { label: 'Sincronizando...', className: 'bg-amber-50 text-amber-700 border-amber-200', dotClassName: 'bg-amber-500' }
            : { label: 'Online', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClassName: 'bg-emerald-500' };

    return (
        <div className="flex h-screen overflow-hidden bg-bg-app">
            {/* Mobile Topbar */}
            <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
                        aria-label={isMobileDrawerOpen ? 'Fechar menu' : 'Abrir menu'}
                    >
                        {isMobileDrawerOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_8px_rgba(16,185,129,0.3)]">V</div>
                    <span className="font-bold text-slate-800 tracking-tight">Verdy</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-slate-500 hover:text-primary"><Bell size={20} /></button>
                    <div className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${connectionConfig.className}`}>
                        <span className={`w-2 h-2 rounded-full ${connectionConfig.dotClassName}`} />
                        {connectionConfig.label}
                    </div>
                    <div ref={userMenuRef} className="relative">
                        <button
                            onClick={() => setIsUserMenuOpen((prev) => !prev)}
                            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500"
                        >
                            {userAvatar ? (
                                <img src={userAvatar} alt={userDisplayName} className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} />
                            )}
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-20">
                                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                    <div className="text-xs font-semibold text-slate-800 truncate">{userDisplayName}</div>
                                    <div className="text-[11px] text-slate-500 truncate">{userDisplayEmail || 'Conta ativa'}</div>
                                </div>
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
            </div>

            {isMobileDrawerOpen && (
                <div className="lg:hidden fixed inset-0 z-40">
                    <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="absolute inset-0 bg-slate-900/40"
                        aria-label="Fechar menu"
                    />
                    <aside className="absolute left-0 top-0 h-full w-full bg-white border-r border-slate-200 p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm">V</div>
                                <span className="font-bold text-slate-800 tracking-tight">Verdy</span>
                            </div>
                            <button
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 inline-flex items-center justify-center"
                                aria-label="Fechar menu"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                                        ? 'bg-primary text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}

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
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${connectionConfig.className}`}>
                            <span className={`w-2 h-2 rounded-full ${connectionConfig.dotClassName}`} />
                            {connectionConfig.label}
                        </div>
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

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-8">
                    {renderContent()}
                </div>
            </main>
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
