import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, Edit3, Camera, Coffee, Moon, Activity, X, ChevronDown, ArrowLeft, UserX, Save } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, setDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const SegmentControls = ({ options, active, onChange }) => (
    <div className="flex bg-slate-100/50 p-0.5 rounded-xl w-full">
        {options.map(opt => (
            <button
                key={opt}
                className={`segment-btn ${active === opt ? 'active' : ''}`}
                onClick={() => onChange(opt)}
            >
                {opt}
            </button>
        ))}
    </div>
);

const initialDraftState = {
    meals: { 'Lanche Manhã': null, 'Almoço': null, 'Lanche Tarde': null, 'Jantar': null },
    rest: { 'Sono Manhã': null, 'Sono Tarde': null },
    activities: { 'Manhã': null, 'Tarde': null },
    evacuation: { 'Manhã': null, 'Tarde': null },
    obs: ''
};

const CadernetaView = ({ student, turma, onBack, onUpdateStatus }) => {
    const [currentForm, setCurrentForm] = useState(initialDraftState);
    const [isAbsent, setIsAbsent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadingCaderneta, setLoadingCaderneta] = useState(true);

    // Formatar data pra hoje no formato YYYY-MM-DD
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Carregar caderneta do Firestore se existir
    useEffect(() => {
        const loadCaderneta = async () => {
            try {
                if (!db || !student.id) {
                    setLoadingCaderneta(false);
                    return;
                }

                const todayDate = getTodayDate();
                const cadernetasQuery = query(
                    collection(db, 'cadernetaEntries'),
                    where('studentId', '==', student.id),
                    where('date', '==', todayDate)
                );

                const snapshot = await getDocs(cadernetasQuery);
                
                if (!snapshot.empty) {
                    const cadernetaData = snapshot.docs[0].data();
                    setCurrentForm(cadernetaData.data || initialDraftState);
                    setIsAbsent(cadernetaData.isAbsent || false);
                }

                setLoadingCaderneta(false);
            } catch (error) {
                console.error('Erro ao carregar caderneta:', error);
                setLoadingCaderneta(false);
            }
        };

        loadCaderneta();
    }, [student.id]);

    const updateForm = (section, item, value) => {
        if (isAbsent) return;

        const updatedForm = {
            ...currentForm,
            [section]: {
                ...currentForm[section],
                [item]: value
            }
        };
        if (section === 'obs') updatedForm.obs = value;

        setCurrentForm(updatedForm);
        
        // Se preencheu algo e não foi enviado, atualiza status para draft
        if (student.status !== 'sent') {
            onUpdateStatus('draft');
        }
    };

    const handleMarkAbsent = () => {
        if (isAbsent) {
            setIsAbsent(false);
            onUpdateStatus('pending');
        } else {
            setIsAbsent(true);
            onUpdateStatus('absent');
        }
    };

    const handleSendToParents = async () => {
        try {
            setIsSaving(true);

            if (!db) {
                toast.error('Erro de conexão. Tente novamente.');
                setIsSaving(false);
                return;
            }

            const todayDate = getTodayDate();
            const cadernetaData = {
                studentId: student.id,
                studentName: student.name,
                turmaId: turma.id,
                turmaName: turma.nome,
                date: todayDate,
                data: currentForm,
                isAbsent: isAbsent,
                status: isAbsent ? 'absent' : 'sent',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Verificar se já existe entrada de hoje
            const cadernetasQuery = query(
                collection(db, 'cadernetaEntries'),
                where('studentId', '==', student.id),
                where('date', '==', todayDate)
            );

            const snapshot = await getDocs(cadernetasQuery);

            if (!snapshot.empty) {
                // Atualizar existente
                const docId = snapshot.docs[0].id;
                await setDoc(doc(db, 'cadernetaEntries', docId), {
                    ...cadernetaData,
                    createdAt: snapshot.docs[0].data().createdAt // Manter a data de criação
                });
            } else {
                // Criar novo
                await addDoc(collection(db, 'cadernetaEntries'), cadernetaData);
            }

            if (isAbsent) {
                toast.success(`Falta de ${student.name} registrada!`);
            } else {
                toast.success(`Caderneta de ${student.name} enviada!`);
            }

            onUpdateStatus(isAbsent ? 'absent' : 'sent');
            setIsSaving(false);
            onBack();
        } catch (error) {
            console.error('Erro ao salvar caderneta:', error);
            toast.error('Erro ao salvar. Tente novamente.');
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-0 max-w-4xl mx-auto">

            {/* Header Compacto de Edição */}
            <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2 lg:mb-6 glass-panel !p-4 transition-colors ${isAbsent ? 'bg-red-50/80 border-red-200' : ''}`}>

                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary transition-colors bg-white">
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full p-0.5 bg-slate-200">
                            <img src={student.avatar} alt="Avatar" className={`w-full h-full rounded-full object-cover ${isAbsent ? 'grayscale' : ''}`} />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">{turma?.nome}</div>
                            <div className={`font-bold text-lg ${isAbsent ? 'text-red-700 line-through' : 'text-slate-800'}`}>
                                {student.name}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMarkAbsent}
                        className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 ${isAbsent ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                    >
                        <UserX size={18} /> {isAbsent ? 'Marcado como Falta' : 'Indicar Falta'}
                    </button>
                    <button
                        className={`btn-primary px-5 py-2.5 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={handleSendToParents}
                        disabled={isSaving}
                    >
                        <Send size={18} /> {isAbsent ? 'Confirmar Falta' : 'Enviar'}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-300 ${isAbsent ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>

                {/* Refeições */}
                <div className="glass-panel">
                    <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                        <Coffee className="text-primary" size={20} /> Refeições
                    </div>
                    <div className="flex flex-col gap-3">
                        {Object.keys(currentForm.meals).map(meal => (
                            <div key={meal} className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                <span className="font-medium text-slate-700 text-sm">{meal}</span>
                                <div className="w-full lg:w-[320px]">
                                    <SegmentControls
                                        options={['Total', 'Suficiente', 'Insuficiente', 'Recusou']}
                                        active={currentForm.meals[meal]}
                                        onChange={(v) => updateForm('meals', meal, v)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Descanso */}
                <div className="glass-panel">
                    <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                        <Moon className="text-primary" size={20} /> Descanso
                    </div>
                    <div className="flex flex-col gap-3">
                        {Object.keys(currentForm.rest).map(item => (
                            <div key={item} className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                <span className="font-medium text-slate-700 text-sm">{item}</span>
                                <div className="w-full lg:w-[180px]">
                                    <SegmentControls
                                        options={['Sim', 'Não']}
                                        active={currentForm.rest[item]}
                                        onChange={(v) => updateForm('rest', item, v)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Participação e Evacuação */}
                <div className="glass-panel lg:col-span-full flex flex-col lg:flex-row gap-8 lg:gap-12">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                            <Activity className="text-primary" size={20} /> Atividades
                        </div>
                        <div className="flex flex-col gap-3">
                            {['Manhã', 'Tarde'].map(period => (
                                <div key={period} className="flex flex-col justify-between gap-3">
                                    <span className="font-medium text-slate-700 text-sm">{period}</span>
                                    <SegmentControls
                                        options={['Ativa', 'Parcial', 'Sem Participação']}
                                        active={currentForm.activities[period]}
                                        onChange={(v) => updateForm('activities', period, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hidden lg:block w-px bg-slate-200"></div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                            <CheckCircle className="text-primary" size={20} /> Evacuação
                        </div>
                        <div className="flex flex-col gap-3">
                            {['Manhã', 'Tarde'].map(period => (
                                <div key={period} className="flex flex-col justify-between gap-3">
                                    <span className="font-medium text-slate-700 text-sm">{period}</span>
                                    <SegmentControls
                                        options={['Normal', 'Alterado', 'Não houve']}
                                        active={currentForm.evacuation[period]}
                                        onChange={(v) => updateForm('evacuation', period, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Observações */}
                <div className="glass-panel lg:col-span-full">
                    <div className="flex items-center gap-2 text-[17px] font-semibold text-primary-dark mb-4">
                        <Edit3 className="text-primary" size={20} /> Observações e Recados
                    </div>
                    <textarea
                        className="form-control min-h-[120px] resize-none"
                        placeholder={`Escreva notas importantes sobre o dia de ${student?.name.split(' ')[0]}...`}
                        value={currentForm.obs}
                        onChange={(e) => updateForm('obs', null, e.target.value)}
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

export default CadernetaView;
