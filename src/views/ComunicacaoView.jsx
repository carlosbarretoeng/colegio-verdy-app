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
            <div className="w-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Megaphone size={32} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Mensagens</h2>
                    <p className="text-slate-500">Esta funcionalidade está em desenvolvimento.</p>
                    <p className="text-sm text-slate-400 mt-1">Em breve você poderá se comunicar diretamente com pais, professore e direção.</p>
                </div>
            </div>
        </div>
    );
};

export default ComunicacaoView;
