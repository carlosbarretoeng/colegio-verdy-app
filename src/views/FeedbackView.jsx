import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Lightbulb, Loader2, Send, Trash2, X } from 'lucide-react';
import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import toast from 'react-hot-toast';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const MAX_IMAGENS = 4;
const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB por imagem

function formatarData(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function FeedbackView() {
    const { currentUser, userProfile, userRole } = useAuth();

    const [mensagem, setMensagem]     = useState('');
    const [imagens, setImagens]       = useState([]); // { file, preview }
    const [enviando, setEnviando]     = useState(false);
    const [historico, setHistorico]   = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [imagemAberta, setImagemAberta] = useState(null);
    const inputRef = useRef(null);

    // Carrega histórico do usuário em tempo real
    useEffect(() => {
        if (!db || !currentUser?.uid) return;
        const q = query(
            collection(db, 'feedback'),
            where('uid', '==', currentUser.uid),
            orderBy('criadoEm', 'desc'),
        );
        const unsub = onSnapshot(q, (snap) => {
            setHistorico(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCarregando(false);
        }, () => setCarregando(false));
        return () => unsub();
    }, [currentUser?.uid]);

    const adicionarImagens = (files) => {
        const novas = Array.from(files).filter(f => {
            if (!f.type.startsWith('image/')) {
                toast.error(`"${f.name}" não é uma imagem.`);
                return false;
            }
            if (f.size > MAX_BYTES) {
                toast.error(`"${f.name}" excede 5 MB.`);
                return false;
            }
            return true;
        });
        setImagens(prev => {
            const vagas = MAX_IMAGENS - prev.length;
            if (vagas <= 0) { toast.error(`Limite de ${MAX_IMAGENS} imagens atingido.`); return prev; }
            return [...prev, ...novas.slice(0, vagas).map(f => ({ file: f, preview: URL.createObjectURL(f) }))];
        });
    };

    const removerImagem = (idx) => {
        setImagens(prev => {
            URL.revokeObjectURL(prev[idx].preview);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        adicionarImagens(e.dataTransfer.files);
    };

    const handleEnviar = async () => {
        if (!mensagem.trim() && imagens.length === 0) {
            toast.error('Escreva uma mensagem ou adicione ao menos uma imagem.');
            return;
        }
        if (!db) return;

        setEnviando(true);
        try {
            // Faz upload das imagens
            const imagensUrls  = [];
            const imagensPaths = [];
            for (const img of imagens) {
                const nomeSeguro = img.file.name.replace(/\s+/g, '_');
                const path = `feedback/${currentUser.uid}/${Date.now()}_${nomeSeguro}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, img.file);
                const url = await getDownloadURL(storageRef);
                imagensUrls.push(url);
                imagensPaths.push(path);
            }

            await addDoc(collection(db, 'feedback'), {
                uid:      currentUser.uid,
                nome:     userProfile?.nome || currentUser.displayName || 'Usuário',
                role:     userRole || 'parent',
                mensagem: mensagem.trim(),
                imagensUrls,
                imagensPaths,
                criadoEm: serverTimestamp(),
                lido:     false,
            });

            // Limpa o formulário
            setMensagem('');
            imagens.forEach(img => URL.revokeObjectURL(img.preview));
            setImagens([]);
            toast.success('Mensagem enviada! Obrigado pela contribuição 🙏');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar. Tente novamente.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Lightbulb size={20} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Fale com o Desenvolvedor</h1>
                    <p className="text-sm text-slate-500">Sugestões, melhorias ou problemas — sua opinião é bem-vinda!</p>
                </div>
            </div>

            {/* Formulário */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
                <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    placeholder="Descreva sua sugestão ou melhoria..."
                    rows={5}
                    className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />

                {/* Drop zone / imagens */}
                {imagens.length < MAX_IMAGENS && (
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className="mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 text-sm cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors select-none"
                    >
                        <ImagePlus size={18} />
                        <span>Adicionar imagens <span className="text-slate-300">({imagens.length}/{MAX_IMAGENS})</span></span>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => { adicionarImagens(e.target.files); e.target.value = ''; }}
                        />
                    </div>
                )}

                {/* Pré-visualização */}
                {imagens.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {imagens.map((img, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
                                <img
                                    src={img.preview}
                                    alt=""
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setImagemAberta(img.preview)}
                                />
                                <button
                                    onClick={() => removerImagem(i)}
                                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                        {imagens.length < MAX_IMAGENS && (
                            <button
                                onClick={() => inputRef.current?.click()}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-primary/40 hover:text-primary/50 transition-colors"
                            >
                                <ImagePlus size={20} />
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleEnviar}
                        disabled={enviando}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {enviando
                            ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                            : <><Send size={15} /> Enviar</>
                        }
                    </button>
                </div>
            </div>

            {/* Histórico */}
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Suas mensagens enviadas</h2>

            {carregando ? (
                <div className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                            <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
                            <div className="h-12 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            ) : historico.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                    Nenhuma mensagem enviada ainda.
                </div>
            ) : (
                <div className="space-y-3">
                    {historico.map(item => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-400">{formatarData(item.criadoEm)}</span>
                                {item.lido
                                    ? <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">Lido</span>
                                    : <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Enviado</span>
                                }
                            </div>
                            {item.mensagem && (
                                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{item.mensagem}</p>
                            )}
                            {item.imagensUrls?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {item.imagensUrls.map((url, i) => (
                                        <img
                                            key={i}
                                            src={url}
                                            alt=""
                                            className="w-16 h-16 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition"
                                            onClick={() => setImagemAberta(url)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {imagemAberta && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setImagemAberta(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
                        onClick={() => setImagemAberta(null)}
                    >
                        <X size={18} />
                    </button>
                    <img
                        src={imagemAberta}
                        alt=""
                        className="max-w-full max-h-[90vh] rounded-xl object-contain"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
