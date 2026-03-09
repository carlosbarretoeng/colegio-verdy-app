import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function SimulacaoUsuarioDropdown() {
  const { activeUserRole, impersonateUser, stopImpersonation, impersonatedUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [selecionado, setSelecionado] = useState('');
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  useEffect(() => {
    if (activeUserRole !== 'root' && !impersonatedUser) return;
    setCarregandoUsuarios(true);
    getDocs(collection(db, 'users')).then(snapshot => {
      const lista = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      const teachers = lista.filter(u => u.role === 'teacher').sort((a, b) => (a.nome || a.username || '').localeCompare(b.nome || b.username || '', 'pt-BR'));
      const parents = lista.filter(u => u.role === 'parent').sort((a, b) => (a.nome || a.username || '').localeCompare(b.nome || b.username || '', 'pt-BR'));
      setUsuarios([...teachers, ...parents]);
      setCarregandoUsuarios(false);
    }).catch(() => setCarregandoUsuarios(false));
  }, [activeUserRole, impersonatedUser]);

  if (activeUserRole !== 'root' && !impersonatedUser) return null;

  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-700">Simular acesso como:</span>
      <select
        className="border rounded px-2 py-1"
        value={selecionado}
        onChange={e => setSelecionado(e.target.value)}
        disabled={carregandoUsuarios}
      >
        <option value="">Selecione um usuário...</option>
        {usuarios.filter(u => u.role === 'teacher').length > 0 && (
          <optgroup label="Professores">
            {usuarios.filter(u => u.role === 'teacher').map(u => (
              <option key={u.uid} value={u.uid} style={{ color: '#2563eb', fontWeight: 'bold' }}>
                👨‍🏫 {u.nome || u.username || u.email}
              </option>
            ))}
          </optgroup>
        )}
        {usuarios.filter(u => u.role === 'parent').length > 0 && (
          <optgroup label="Responsáveis">
            {usuarios.filter(u => u.role === 'parent').map(u => (
              <option key={u.uid} value={u.uid} style={{ color: '#059669', fontWeight: 'bold' }}>
                👨‍👩‍👧‍👦 {u.nome || u.username || u.email}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button
        className="ml-2 px-3 py-1 bg-primary text-white rounded disabled:opacity-50"
        disabled={!selecionado || carregandoUsuarios}
        onClick={() => {
          const user = usuarios.find(u => u.uid === selecionado);
          if (user) {
            impersonateUser(user);
            window.location.reload();
          }
        }}
      >Simular</button>
      {impersonatedUser && (
        <button
          className="ml-2 px-3 py-1 bg-slate-400 text-white rounded"
          onClick={stopImpersonation}
        >Voltar ao usuário root</button>
      )}
      {impersonatedUser && (
        <span className="ml-3 text-sm text-orange-600 font-semibold">
          Modo simulação ativo: {impersonatedUser.nome || impersonatedUser.username || impersonatedUser.email}
        </span>
      )}
    </div>
  );
}
