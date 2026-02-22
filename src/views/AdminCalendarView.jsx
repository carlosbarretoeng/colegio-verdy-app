import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const TIPOS_EVENTO = ['Administrativos', 'Acadêmicos', 'Feriado', 'Recesso'];
const ITEMS_PER_PAGE = 5;
const EMPTY_EVENTO_FORM = {
  titulo: '',
  tipo: 'Administrativos',
  data: '',
  local: '',
  descricao: '',
  diaTodo: false,
  horario: '',
  anexoUrl: '',
  anexoNome: '',
  anexoMimeType: '',
  anexoPath: ''
};

export default function AdminCalendarView() {
  const [eventos, setEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(true);
  const [mostrarFormEvento, setMostrarFormEvento] = useState(false);
  const [eventoEmEdicaoId, setEventoEmEdicaoId] = useState(null);
  const [formEvento, setFormEvento] = useState(EMPTY_EVENTO_FORM);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [arquivoAnexo, setArquivoAnexo] = useState(null);
  const [pagina, setPagina] = useState(1);
  const descricaoRef = useRef(null);

  useEffect(() => {
    if (!db) return () => { };

    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const lista = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          titulo: data.titulo || 'Sem título',
          tipo: data.tipo || 'Administrativos',
          data: data.data || '',
          local: data.local || '',
          descricao: data.descricao || '',
          diaTodo: !!data.diaTodo,
          horario: data.horario || '',
          anexoUrl: data.anexoUrl || '',
          anexoNome: data.anexoNome || '',
          anexoMimeType: data.anexoMimeType || '',
          anexoPath: data.anexoPath || ''
        };
      }).sort((a, b) => {
        const dataA = `${a.data || ''} ${a.horario || ''}`;
        const dataB = `${b.data || ''} ${b.horario || ''}`;
        return dataB.localeCompare(dataA);
      });

      setEventos(lista);
      setCarregandoEventos(false);
    }, () => {
      setEventos([]);
      setCarregandoEventos(false);
    });

    return () => unsubscribe();
  }, []);

  const formatarDataEvento = (dataISO) => {
    if (!dataISO) return { dia: '--', mes: '---' };
    const [ano, mes, dia] = dataISO.split('-');
    if (!ano || !mes || !dia) return { dia: '--', mes: '---' };
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

    return {
      dia: String(data.getDate()).padStart(2, '0'),
      mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    };
  };

  const abrirNovoEvento = () => {
    setEventoEmEdicaoId(null);
    setFormEvento(EMPTY_EVENTO_FORM);
    setArquivoAnexo(null);
    setMostrarFormEvento(true);
  };

  const abrirEditarEvento = (evento) => {
    setEventoEmEdicaoId(evento.id);
    setFormEvento({
      titulo: evento.titulo || '',
      tipo: evento.tipo || 'Administrativos',
      data: evento.data || '',
      local: evento.local || '',
      descricao: evento.descricao || '',
      diaTodo: !!evento.diaTodo,
      horario: evento.horario || '',
      anexoUrl: evento.anexoUrl || '',
      anexoNome: evento.anexoNome || '',
      anexoMimeType: evento.anexoMimeType || '',
      anexoPath: evento.anexoPath || ''
    });
    setArquivoAnexo(null);
    setMostrarFormEvento(true);
  };

  const fecharFormEvento = () => {
    setEventoEmEdicaoId(null);
    setFormEvento(EMPTY_EVENTO_FORM);
    setArquivoAnexo(null);
    setMostrarFormEvento(false);
  };

  useEffect(() => {
    if (!mostrarFormEvento || !descricaoRef.current) return;
    descricaoRef.current.innerHTML = formEvento.descricao || '';
  }, [mostrarFormEvento, eventoEmEdicaoId]);

  const aplicarComandoDescricao = (command) => {
    document.execCommand(command, false);
    if (descricaoRef.current) {
      setFormEvento((prev) => ({ ...prev, descricao: descricaoRef.current.innerHTML }));
    }
  };

  const removerHtml = (conteudo) => {
    return (conteudo || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const totalPaginas = useMemo(() => Math.max(1, Math.ceil(eventos.length / ITEMS_PER_PAGE)), [eventos.length]);
  const paginaSegura = Math.min(pagina, totalPaginas);
  const eventosPaginados = useMemo(
    () => eventos.slice((paginaSegura - 1) * ITEMS_PER_PAGE, paginaSegura * ITEMS_PER_PAGE),
    [eventos, paginaSegura]
  );

  const handleSalvarEvento = async (event) => {
    event.preventDefault();

    const titulo = formEvento.titulo.trim();
    const tipo = formEvento.tipo;
    const data = formEvento.data;
    const local = formEvento.local.trim();
    const descricao = (formEvento.descricao || '').trim();
    const diaTodo = !!formEvento.diaTodo;
    const horario = formEvento.horario;
    if (!titulo || !tipo || !data || (!diaTodo && !horario) || !db) return;

    try {
      setSalvandoEvento(true);

      let anexoUrl = formEvento.anexoUrl || '';
      let anexoNome = formEvento.anexoNome || '';
      let anexoMimeType = formEvento.anexoMimeType || '';
      let anexoPath = formEvento.anexoPath || '';

      if (arquivoAnexo && storage) {
        const nomeSeguro = arquivoAnexo.name.replace(/\s+/g, '_');
        const caminhoArquivo = `events/${Date.now()}-${nomeSeguro}`;
        const arquivoRef = ref(storage, caminhoArquivo);
        await uploadBytes(arquivoRef, arquivoAnexo);
        anexoUrl = await getDownloadURL(arquivoRef);
        anexoNome = arquivoAnexo.name;
        anexoMimeType = arquivoAnexo.type || '';

        if (formEvento.anexoPath) {
          try {
            await deleteObject(ref(storage, formEvento.anexoPath));
          } catch {
          }
        }

        anexoPath = caminhoArquivo;
      }

      const payload = {
        titulo,
        tipo,
        data,
        local,
        descricao,
        diaTodo,
        horario: diaTodo ? '' : horario,
        anexoUrl,
        anexoNome,
        anexoMimeType,
        anexoPath,
        updatedAt: serverTimestamp()
      };

      if (!eventoEmEdicaoId) {
        await addDoc(collection(db, 'events'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'events', eventoEmEdicaoId), payload);
      }

      setPagina(1);
      fecharFormEvento();
    } finally {
      setSalvandoEvento(false);
    }
  };

  const handleRemoverEvento = async (eventoId) => {
    if (!db) return;
    const evento = eventos.find((item) => item.id === eventoId);
    await deleteDoc(doc(db, 'events', eventoId));

    if (evento?.anexoPath && storage) {
      try {
        await deleteObject(ref(storage, evento.anexoPath));
      } catch {
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Calendário Escolar</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie os eventos e compromissos da escola.</p>
        </div>

        <button
          onClick={mostrarFormEvento ? fecharFormEvento : abrirNovoEvento}
          className="h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors inline-flex items-center gap-1"
        >
          {mostrarFormEvento ? <X size={14} /> : <Plus size={14} />}
          {mostrarFormEvento ? 'Cancelar' : 'Novo evento'}
        </button>
      </div>

      {mostrarFormEvento && (
        <form onSubmit={handleSalvarEvento} className="rounded-xl border border-slate-200 p-3 bg-white/80 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <label className="md:col-span-2 text-sm text-slate-600 flex flex-col gap-1">
            Título
            <input
              value={formEvento.titulo}
              onChange={(event) => setFormEvento((prev) => ({ ...prev, titulo: event.target.value }))}
              className="form-control !py-2.5"
              placeholder="Título do evento"
              required
            />
          </label>
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            Tipo
            <select
              value={formEvento.tipo}
              onChange={(event) => setFormEvento((prev) => ({ ...prev, tipo: event.target.value }))}
              className="form-control !py-2.5"
              required
            >
              {TIPOS_EVENTO.map((tipoEvento) => (
                <option key={tipoEvento} value={tipoEvento}>{tipoEvento}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            Data
            <input
              type="date"
              value={formEvento.data}
              onChange={(event) => setFormEvento((prev) => ({ ...prev, data: event.target.value }))}
              className="form-control !py-2.5"
              required
            />
          </label>
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            Local
            <input
              value={formEvento.local}
              onChange={(event) => setFormEvento((prev) => ({ ...prev, local: event.target.value }))}
              className="form-control !py-2.5"
              placeholder="Ex.: Auditório"
            />
          </label>
          <div className="text-sm text-slate-600 flex flex-col gap-1">
            <span>Período</span>
            <div className="h-[42px] flex items-center">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={formEvento.diaTodo}
                  onChange={(event) => setFormEvento((prev) => ({ ...prev, diaTodo: event.target.checked, horario: event.target.checked ? '' : prev.horario }))}
                />
                Dia todo
              </label>
            </div>
          </div>
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            Horário
            <input
              type="time"
              value={formEvento.horario}
              onChange={(event) => setFormEvento((prev) => ({ ...prev, horario: event.target.value }))}
              className="form-control !py-2.5"
              required={!formEvento.diaTodo}
              disabled={formEvento.diaTodo}
            />
          </label>
          <label className="md:col-span-2 text-sm text-slate-600 flex flex-col gap-1">
            Anexo (PDF ou imagem)
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => setArquivoAnexo(event.target.files?.[0] || null)}
              className="form-control !py-2.5"
            />
            {!arquivoAnexo && formEvento.anexoUrl && (
              <a href={formEvento.anexoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">
                Anexo atual: {formEvento.anexoNome || 'Visualizar arquivo'}
              </a>
            )}
          </label>
          <div className="md:col-span-6 flex flex-col gap-2 text-sm text-slate-600">
            <span>Descrição</span>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 w-fit">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => aplicarComandoDescricao('bold')} className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100 font-semibold">B</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => aplicarComandoDescricao('italic')} className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100 italic">I</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => aplicarComandoDescricao('underline')} className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100 underline">U</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => aplicarComandoDescricao('insertUnorderedList')} className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100">•</button>
            </div>
            <div
              ref={descricaoRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(event) => {
                const html = event.currentTarget.innerHTML;
                setFormEvento((prev) => ({ ...prev, descricao: html }));
              }}
              className="min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              disabled={salvandoEvento}
              className="h-9 px-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {eventoEmEdicaoId ? 'Salvar edição' : 'Salvar evento'}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel p-5 border border-slate-200/60">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-slate-500" />
          <h3 className="text-lg font-bold text-slate-800">Eventos</h3>
        </div>

        <div className="flex flex-col gap-3">
          {carregandoEventos && <div className="text-sm text-slate-500">Carregando eventos...</div>}

          {!carregandoEventos && eventosPaginados.map((evento) => {
            const dataFormatada = formatarDataEvento(evento.data);
            return (
              <div key={evento.id} className="mb-2 rounded-lg bg-slate-100 border border-slate-200 shadow-md text-slate-700 border-l-8 border-l-slate-500">
                <div className="flex gap-3 md:items-center md:gap-3">
                  <div className="hidden md:flex items-center gap-2 flex-wrap p-2">
                    <button onClick={() => abrirEditarEvento(evento)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-200 transition-colors flex flex-col items-center gap-1">
                      <Pencil/>
                      Editar
                    </button>
                    <button onClick={() => handleRemoverEvento(evento.id)} className="w-16 px-2 rounded-md p-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex flex-col items-center gap-1">
                      <Trash2/>
                      Excluir
                    </button>
                  </div>

                  <div className="md:grow min-w-0 my-3">
                    <div className="ps-2 flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-500 flex flex-col items-center justify-center shrink-0">
                        <span className="text-base font-bold text-slate-500 leading-none">{dataFormatada.dia}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{dataFormatada.mes}</span>
                      </div>
                      <div className="min-w-0 md:grow">
                        <div className="font-semibold text-slate-800 truncate">{evento.titulo}<span className={`inline-flex items-center ${evento.anexoUrl ? '' : 'hidden'}`}>&nbsp;&nbsp;<Paperclip size={14}/></span></div>
                        <div className="text-xs text-slate-500 mt-0.5">{evento.tipo}</div>
                        <div className="md:hidden text-xs text-slate-500">{evento.diaTodo ? 'Dia todo' : evento.horario}</div>
                        <div className="md:hidden text-xs text-slate-500 mt-0.5 truncate">{evento.local}</div>
                      </div>
                      <div className='hidden md:block md:w-32'>
                        <div className="text-sm text-slate-500">{evento.diaTodo ? 'Dia todo' : evento.horario}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{evento.local}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:hidden p-1">
                  <button onClick={() => abrirEditarEvento(evento)} className="h-8 px-2 rounded-s-md text-xs font-medium text-primary border border-primary border-r-0 inline-flex justify-center items-center gap-1">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleRemoverEvento(evento.id)} className="h-8 px-2 rounded-e-lg text-xs font-medium text-red-600 border border-primary border-l-0 inline-flex justify-center items-center gap-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {!carregandoEventos && eventos.length === 0 && (
            <div className="text-sm text-slate-500">Nenhum evento cadastrado.</div>
          )}

          {!carregandoEventos && eventos.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Página {paginaSegura} de {totalPaginas}</span>
              <div className="flex gap-2">
                <button
                  disabled={paginaSegura === 1}
                  onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                  className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={paginaSegura === totalPaginas}
                  onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                  className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
