import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CatalogoCriterios,
  CriterioCatalogo,
  DimensionEvaluacion,
  TipoCriterio,
} from '../../types';

interface Props {
  /** Nulo cuando se está agregando uno nuevo. */
  criterio: CriterioCatalogo | null;
  catalogo: CatalogoCriterios;
  onListo: (datos: CatalogoCriterios) => void | Promise<void>;
}

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Redacta o corrige un criterio del catálogo (EFDS-1443).
 *
 * Pide el fundamento junto con el peso por la misma razón que el editor de
 * plazos: una cifra que decide quién gana una licitación tiene que poder
 * defenderse ante un ente de control, y dentro de un año nadie recordará si
 * salió del pliego o de un supuesto del equipo.
 */
export function EditorCriterio({ criterio, catalogo, onListo }: Props) {
  const [modalidad, setModalidad] = useState(criterio?.modalidad ?? '');
  const [dimension, setDimension] = useState<DimensionEvaluacion>(criterio?.dimension ?? 'JURIDICO');
  const [tipo, setTipo] = useState<TipoCriterio>(criterio?.tipo ?? 'HABILITANTE');
  const [nombre, setNombre] = useState(criterio?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(criterio?.descripcion ?? '');
  const [puntaje, setPuntaje] = useState(
    criterio?.puntajeMaximo != null ? String(criterio.puntajeMaximo) : '',
  );
  const [orden, setOrden] = useState(String(criterio?.orden ?? 0));
  const [fundamento, setFundamento] = useState(criterio?.fundamento ?? '');
  const [confirmado, setConfirmado] = useState(criterio?.confirmado ?? false);
  const [guardando, setGuardando] = useState(false);

  const usado = (criterio?.evaluacionesQueLoUsan ?? 0) > 0;
  const ponderable = tipo === 'PONDERABLE';
  const numero = Number(puntaje);
  const puntajeValido = !ponderable || (Number.isFinite(numero) && numero > 0 && numero <= 100);
  const valido = nombre.trim().length >= 3 && puntajeValido;

  const guardar = async () => {
    setGuardando(true);
    try {
      const datos = {
        modalidad: modalidad || null,
        dimension,
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        // El backend rechaza un habilitante con puntaje: no es lo mismo un
        // cero que un criterio que no puntúa.
        puntajeMaximo: ponderable ? numero : null,
        orden: Number(orden) || 0,
        fundamento: fundamento.trim() || null,
        confirmado,
      };

      const tras = criterio
        ? await contratacionService.actualizarCriterio(criterio.id, datos)
        : await contratacionService.crearCriterio(datos);

      toast.success(criterio ? 'Criterio actualizado' : 'Criterio agregado al catálogo');
      await onListo(tras);
    } catch (err: any) {
      toast.error('No se pudo guardar el criterio', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Dimensión</span>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as DimensionEvaluacion)}
            disabled={usado}
            aria-label="Dimensión de la evaluación"
            className={campo}
          >
            {catalogo.dimensiones.map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.nombre}
                {d.calculada ? ' (se calcula sobre el precio)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCriterio)}
            disabled={usado}
            aria-label="Tipo de criterio"
            className={campo}
          >
            <option value="HABILITANTE">Habilitante · deja pasar o deja fuera</option>
            <option value="PONDERABLE">Ponderable · suma puntaje</option>
          </select>
        </label>
      </div>

      {usado && (
        <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Este criterio ya se usó en {criterio!.evaluacionesQueLoUsan}{' '}
          {criterio!.evaluacionesQueLoUsan === 1 ? 'evaluación' : 'evaluaciones'}, así que no cambia
          de dimensión ni de tipo: los juicios ya emitidos quedarían sin poder explicarse. Para eso
          se retira y se crea el que corresponda.
        </p>
      )}

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Experiencia adicional acreditada"
          aria-label="Nombre del criterio"
          className={campo}
        />
        <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
          Es lo que lee el evaluador al calificar: conviene transcribirlo del pliego.
        </span>
      </label>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Qué se verifica</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Contratos acreditados por encima de la experiencia mínima exigida."
          aria-label="Descripción del criterio"
          className={campo}
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Modalidad</span>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            aria-label="Modalidad a la que aplica"
            className={campo}
          >
            <option value="">Todas las modalidades</option>
            {catalogo.modalidades.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>

        {/* Solo en los ponderables: en un habilitante no hay puntaje que dar. */}
        {ponderable && (
          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">Puntaje máximo</span>
            <input
              value={puntaje}
              onChange={(e) => setPuntaje(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="30"
              aria-label="Puntaje máximo del criterio"
              className={`${campo} tabular-nums`}
            />
          </label>
        )}

        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Orden</span>
          <input
            value={orden}
            onChange={(e) => setOrden(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            aria-label="Posición en la lista del evaluador"
            className={`${campo} tabular-nums`}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Fundamento</span>
        <input
          value={fundamento}
          onChange={(e) => setFundamento(e.target.value)}
          placeholder="Pliego de condiciones, numeral 4.2"
          aria-label="Norma, pliego o acta que respalda el criterio"
          className={campo}
        />
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-700">
            Confirmado por la Dirección de Contratación
          </span>
          <span className="block text-[11px] text-slate-500 leading-relaxed">
            Mientras no se marque, la pantalla de evaluación avisa de que el criterio es provisional.
            Al corregir un peso conviene desmarcarlo: lo ratificado era la cifra anterior.
          </span>
        </span>
      </label>

      {/* La consolidación se calcula al consultarla, así que un peso corregido
          se refleja en lo ya evaluado. Es lo que permite arreglar una cifra mal
          transcrita sin rehacer la evaluación, pero hay que decirlo. */}
      {usado && ponderable && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0 leading-relaxed">
          Cambiar el puntaje máximo cambia el total de las ofertas ya evaluadas con este criterio.
          Los juicios de cada evaluador se conservan; lo que se recalcula es la suma.
        </p>
      )}

      <button
        type="button"
        disabled={guardando || !valido}
        onClick={guardar}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        {criterio ? 'Guardar criterio' : 'Agregar al catálogo'}
      </button>
    </div>
  );
}
