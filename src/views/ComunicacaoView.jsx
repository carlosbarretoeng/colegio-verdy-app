import React, { useState } from 'react';
import { Search, Edit, Send, Paperclip, MoreVertical, CheckCheck, Megaphone, User } from 'lucide-react';

const MOCK_CHATS = [
    { id: '1', type: 'broadcast', name: 'Comunicados Gerais', role: 'Escola', lastMessage: 'Lembrando que amanhã não haverá aula na educação infantil.', time: '14:30', unread: 0 },
    { id: '2', type: 'direct', name: 'Mãe do João Pedro', role: 'Família', lastMessage: 'Ele está melhor da gripe, amanhã irá.', time: '10:15', unread: 2 },
    { id: '3', type: 'direct', name: 'Pai do Lucas T.', role: 'Família', lastMessage: 'Hoje a avó vai buscar o Lucas às 17h, ok?', time: 'Ontem', unread: 0 },
    { id: '4', type: 'direct', name: 'Mãe da Maria Clara', role: 'Família', lastMessage: 'Obrigada pelo cuidado de sempre!', time: 'Segunda', unread: 0 },
];

const MOCK_MESSAGES = [
    { id: 'm1', sender: 'them', text: 'Bom dia professora, o João Pedro acordou com um pouco de tosse.', time: '08:00' },
    { id: 'm2', sender: 'me', text: 'Bom dia mamãe! Entendido, vamos observar ele por aqui. Fique tranquila.', time: '08:15' },
    { id: 'm3', sender: 'them', text: 'Muito obrigada, se tiver febre pode me ligar que eu vou buscar.', time: '08:30' },
    { id: 'm4', sender: 'me', text: 'Combinado.', time: '08:35' },
    { id: 'm5', sender: 'them', text: 'Ele está melhor da gripe, amanhã irá.', time: '10:15' }
];

const ComunicacaoView = () => {
    const [activeChat, setActiveChat] = useState(MOCK_CHATS[1]); // Seleciona a Mãe do João por padrão
    const [filter, setFilter] = useState('all'); // 'all', 'broadcast', 'direct'
    const [inputText, setInputText] = useState('');

    const filteredChats = MOCK_CHATS.filter(chat => {
        if (filter === 'all') return true;
        return chat.type === filter;
    });

    return (
        <div className="flex h-[calc(100vh-140px)] lg:h-[calc(100vh-160px)] gap-0 lg:gap-6 antialiased -mx-4 lg:mx-0">

            {/* Sidebar de Chats */}
            <div className={`${activeChat ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] bg-white lg:rounded-2xl border-r lg:border border-slate-200 overflow-hidden shrink-0 shadow-sm h-full`}>

                {/* Topo da Sidebar de Chat */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Mensagens</h2>
                        <button className="w-9 h-9 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
                            <Edit size={18} />
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Pesquisar conversas..."
                            className="w-full bg-slate-100/80 border-transparent rounded-xl py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder-slate-400"
                        />
                        <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
                    </div>

                    {/* Abas Rápidas */}
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setFilter('all')}
                        >Todas</button>
                        <button
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'broadcast' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setFilter('broadcast')}
                        >Mural</button>
                        <button
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'direct' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setFilter('direct')}
                        >Diretas</button>
                    </div>
                </div>

                {/* Lista de Contatos */}
                <div className="flex-1 overflow-y-auto w-full">
                    {filteredChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setActiveChat(chat)}
                            className={`flex items-center gap-3 p-4 cursor-pointer border-b border-slate-50 transition-colors ${activeChat?.id === chat.id ? 'bg-primary/5 relative' : 'hover:bg-slate-50'}`}
                        >
                            {activeChat?.id === chat.id && <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>}

                            <div className="relative">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${chat.type === 'broadcast' ? 'bg-accent' : 'bg-slate-300'}`}>
                                    {chat.type === 'broadcast' ? <Megaphone size={20} /> : <User size={20} />}
                                </div>
                                {chat.unread > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                        {chat.unread}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-sm text-slate-800 truncate pr-2">{chat.name}</h4>
                                    <span className={`text-[11px] whitespace-nowrap ${chat.unread > 0 ? 'text-primary font-bold' : 'text-slate-400'}`}>{chat.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate mr-2 ${chat.unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{chat.lastMessage}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Área Principal de Chat */}
            <div className={`${activeChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white lg:rounded-2xl lg:border border-slate-200 overflow-hidden lg:shadow-sm h-full w-full`}>

                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-[72px] bg-white border-b border-slate-100 px-4 lg:px-6 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3 lg:gap-4">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>

                                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white ${activeChat.type === 'broadcast' ? 'bg-accent' : 'bg-slate-300'}`}>
                                    {activeChat.type === 'broadcast' ? <Megaphone size={18} /> : <User size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 text-[15px] truncate">{activeChat.name}</h3>
                                    <span className="text-[10px] lg:text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md inline-block mt-0.5">{activeChat.role}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2 shrink-0">
                                <button className="w-10 h-10 rounded-full hidden sm:flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                                    <Search size={20} />
                                </button>
                                <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f4f7f6]/50 flex flex-col gap-4">
                            <div className="text-center my-4">
                                <span className="bg-slate-200/70 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">Hoje</span>
                            </div>

                            {MOCK_MESSAGES.map(msg => {
                                const isMe = msg.sender === 'me';

                                return (
                                    <div key={msg.id} className={`flex max-w-[85%] lg:max-w-[70%] ${isMe ? 'self-end' : 'self-start'}`}>
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-sm'}`}>
                                                <p className="text-[15px] leading-relaxed">{msg.text}</p>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 px-1">
                                                <span className="text-[11px] text-slate-400 font-medium">{msg.time}</span>
                                                {isMe && <CheckCheck size={14} className="text-primary" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white border-t border-slate-100 flex gap-3 items-end">
                            <button className="w-12 h-12 flex shrink-0 items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors">
                                <Paperclip size={22} />
                            </button>
                            <div className="flex-1 bg-slate-100/80 rounded-2xl flex items-center border border-transparent focus-within:border-primary/30 transition-colors px-4">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') setInputText('') }}
                                    placeholder="Digite uma mensagem..."
                                    className="w-full bg-transparent border-none py-3.5 outline-none text-[15px] text-slate-800 placeholder-slate-400"
                                />
                            </div>
                            <button
                                onClick={() => setInputText('')}
                                disabled={!inputText.trim()}
                                className={`w-12 h-12 flex shrink-0 items-center justify-center rounded-xl transition-all ${inputText.trim() ? 'bg-primary text-white shadow-md hover:bg-primary-dark hover:-translate-y-0.5' : 'bg-slate-100 text-slate-300'}`}
                            >
                                <Send size={20} className={inputText.trim() ? "translate-x-0.5" : ""} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                        <Megaphone size={64} className="mb-6 opacity-20 text-primary" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Central de Comunicação</h2>
                        <p className="text-center max-w-sm">Selecione uma conversa à esquerda para trocar mensagens com os responsáveis ou envie um novo Comunicado Geral ao mural.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ComunicacaoView;
