import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { PlantillaFormato } from '../../types';
import { Modal } from '../shared/Modal';

import { NOMBRE_ETAPA } from './simbolos';


/** Word, PDF o Excel: es como el SIG publica sus formatos. */
const EXTENSIONES = '.pdf,.doc,.docx,.xls,.xlsx';

/** El aire de las entradas, igual en el alta y en la lista. */
const CLASE_ENTRADA =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]';

/** Lo que la biblioteca necesita saber de una actividad para ubicar sus formatos. */
interface ActividadCatalogo {
  numeral: string;
  nombre: string;
  etapa: number;
}

/**
 * Un filtro de la lista, con cuántos formatos deja ver.
 *
 * El número va dentro del propio botón: saber que hay tres sin usar solo
 * sirve si desde ahí se llega a esos tres.
 */
function Filtro({
  activo,
  onClick,
  cuenta,
  alerta = false,
  titulo,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  cuenta: number;
  /** Para lo que pide atención, como los formatos que nadie ve. */
  alerta?: boolean;
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={titulo}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        activo
          ? 'border-[#003DA5] bg-[#003DA5] text-white'
          : alerta
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
      <span
        className={`rounded px-1 text-[10px] font-bold ${
          activo ? 'bg-white text-[#003DA5]' : alerta ? 'bg-amber-200' : 'bg-gray-100'
        }`}
      >
        {cuenta}
      </span>
    </button>
  );
}

/**
 * Los formatos institucionales del Sistema Integrado de Gestión.
 *
 * Los documentos del proceso no se redactan en el sistema: la ESAP tiene
 * formatos aprobados —el estudio previo es BS-FO-047— que se diligencian en
 * Word y se firman.
 *
 * Viven aquí y no dentro de cada actividad porque un mismo formato sirve en
 * varias: subirlo actividad por actividad multiplicaría copias del mismo
 * archivo y las dejaría desincronizadas cuando el SIG publique una versión
 * nueva.
 *
 * Desde EFDS-2066 un formato no se asigna a una actividad: lo citan los
 * documentos que cada actividad pide, y se configuran en la actividad
 * (Configuración → la actividad → Documentos). Aquí se ve dónde se usa cada
 * uno, que es lo que hay que saber antes de retirarlo.
 */
export function BibliotecaFormatos() {
  const [formatos, setFormatos] = useState<PlantillaFormato[]>([]);
  const [actividades, setActividades] = useState<ActividadCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  /** Qué subconjunto se está mirando: todos, una etapa, o los que no se usan. */
  const [etapa, setEtapa] = useState<number | 'todas' | 'sin-usar'>('todas');
  // Qué formulario está abierto: 'nuevo' para un alta, el formato para
  // corregirlo, y nada si no hay ninguno. Es el mismo formulario en los dos
  // casos, así que basta un estado para saber con qué datos abrirlo.
  const [editando, setEditando] = useState<PlantillaFormato | 'nuevo' | null>(null);

  const cargar = () =>
    contratacionService
      .plantillas()
      .then(setFormatos)
      .catch(() => setFormatos([]))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    cargar();
    // El catálogo dice a qué etapa pertenece cada actividad que usa un
    // formato, para poder filtrar la biblioteca por etapa.
    contratacionService
      .catalogoActividades()
      .then((etapas) =>
        setActividades(
          etapas.flatMap((e) =>
            e.actividades.map((a) => ({
              numeral: a.numeral,
              nombre: a.nombre,
              etapa: e.etapa,
            })),
          ),
        ),
      )
      .catch(() => setActividades([]));
  }, []);

  // Las etapas de un formato son las de las actividades que lo usan: el
  // mismo formato puede pedirse en la 3.1 y en la 5.4.
  const etapasDe = (formato: PlantillaFormato): number[] => {
    const etapas = (formato.usadaEn ?? [])
      .map((n) => actividades.find((a) => a.numeral === n)?.etapa)
      .filter((e): e is number => e !== undefined);
    return [...new Set(etapas)];
  };

  /** Las etapas que usan algún formato, con cuántos. */
  const etapasConFormatos = useMemo(() => {
    const cuentas = new Map<number, number>();
    for (const f of formatos) {
      for (const e of etapasDe(f)) cuentas.set(e, (cuentas.get(e) ?? 0) + 1);
    }
    return [...cuentas.entries()]
      .map(([etapa, cuenta]) => ({ etapa, cuenta }))
      .sort((a, b) => a.etapa - b.etapa);
  }, [formatos, actividades]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return formatos.filter((f) => {
      if (etapa === 'sin-usar' && (f.usadaEn ?? []).length > 0) return false;
      if (typeof etapa === 'number' && !etapasDe(f).includes(etapa)) return false;
      if (!texto) return true;
      return (
        f.nombre.toLowerCase().includes(texto) ||
        f.codigo.toLowerCase().includes(texto) ||
        (f.usadaEn ?? []).some((n) => n.includes(texto))
      );
    });
  }, [formatos, actividades, busqueda, etapa]);

  const sinUsar = formatos.filter((f) => f.activo && (f.usadaEn ?? []).length === 0).length;
  const filtrando = etapa !== 'todas';

  const cambiarEstado = async (formato: PlantillaFormato) => {
    try {
      await contratacionService.editarPlantilla(formato.id, { activo: !formato.activo });
      await cargar();
      toast.success(formato.activo ? 'Formato retirado' : 'Formato disponible de nuevo');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="m-0 text-xs text-gray-600 leading-relaxed min-w-0 flex-1">
            Aquí están los formatos aprobados del Sistema Integrado de Gestión (SIG). El gestor los
            descarga en cada actividad, junto al documento que los usa. Para elegir en qué
            actividades se pide un formato, abre la actividad y ve a la pestaña Documentos.
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar formato…"
                aria-label="Buscar formato"
                className="w-56 rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditando('nuevo')}
              className="flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Subir formato
            </button>
          </div>
        </div>

        {/* Los contadores son los filtros. Enseñar «12 formatos · 3 sin
            usar» y obligar a buscarlos a mano deja el dato mirando sin
            servir de nada: aquí el número es el botón que los muestra. */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2">
          <Filtro
            activo={etapa === 'todas'}
            onClick={() => setEtapa('todas')}
            cuenta={formatos.length}
          >
            Todos
          </Filtro>

          {/* Solo las etapas que tienen formatos: ofrecer las diez con un cero
              al lado sería una fila de callejones sin salida. */}
          {etapasConFormatos.map(({ etapa: numero, cuenta }) => (
            <Filtro
              key={numero}
              activo={etapa === numero}
              onClick={() => setEtapa(numero)}
              cuenta={cuenta}
              titulo={NOMBRE_ETAPA[numero]}
            >
              Etapa {numero}
            </Filtro>
          ))}

          {sinUsar > 0 && (
            <Filtro
              activo={etapa === 'sin-usar'}
              onClick={() => setEtapa('sin-usar')}
              cuenta={sinUsar}
              alerta
              titulo="Están vigentes, pero ninguna actividad los pide, así que el gestor no los ve"
            >
              Sin usar
            </Filtro>
          )}
        </div>
      </div>

      {editando && (
        <Formulario
          // Remonta el formulario al cambiar de formato: sin esto conservaría
          // en pantalla lo escrito para el anterior.
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          formato={editando === 'nuevo' ? undefined : editando}
          formatos={formatos}
          onListo={async () => {
            await cargar();
            setEditando(null);
          }}
          onCancelar={() => setEditando(null)}
        />
      )}

      {filtrados.length === 0 ? (
        // Un vacío que no ofrece salida deja parado a quien llega: se dice qué
        // hacer, y el botón está ahí mismo.
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
          <FileText className="w-6 h-6 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700 m-0 mt-2">
            {busqueda
              ? `Ningún formato coincide con «${busqueda}»`
              : filtrando
                ? 'Ningún formato en esta etapa'
                : 'Todavía no hay formatos'}
          </p>
          <p className="text-[11px] text-gray-500 mt-1 mb-3">
            {busqueda
              ? 'Prueba con el código del SIG o parte del nombre.'
              : filtrando
                ? 'Los formatos de otras etapas siguen ahí.'
                : 'Sube los formatos aprobados para que el gestor pueda descargarlos.'}
          </p>
          {busqueda || filtrando ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setEtapa('todas');
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver todos los formatos
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditando('nuevo')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Subir el primer formato
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tarjetas en móvil y tabla en escritorio, como auditoría y control
              interno: cinco columnas con selector no caben en un teléfono. */}
          <ul className="lg:hidden m-0 p-0 list-none rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {filtrados.map((f) => (
              <TarjetaFormato
                key={f.id}
                formato={f}
                onEditar={() => setEditando(f)}
                onCambiarEstado={() => cambiarEstado(f)}
              />
            ))}
          </ul>

          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* El nombre del formato es una frase larga —«Estudios previos
                    para procesos de contratación por licitación pública…»— y
                    sin ancho declarado la tabla reparte a partes iguales entre
                    seis columnas, dejándolo en una tira de doce líneas. */}
                <tr className="border-b border-gray-200 bg-slate-50">
                  <th className="w-2/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Formato
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Usado en
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Archivo
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <Fila
                    key={f.id}
                    formato={f}
                    onEditar={() => setEditando(f)}
                    onCambiarEstado={() => cambiarEstado(f)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Un formato de la biblioteca.
 *
 * Se corrige en el mismo formulario con el que se dio de alta, para no tener
 * dos sitios donde editar los mismos datos. Dónde se usa no se cambia aquí:
 * lo decide cada actividad al pedir el documento.
 */
function Fila({
  formato,
  onEditar,
  onCambiarEstado,
}: {
  formato: PlantillaFormato;
  onEditar: () => void;
  onCambiarEstado: () => void;
}) {
  return (
    <tr
      className={`border-b border-gray-100 last:border-0 hover:bg-slate-50 ${
        formato.activo ? '' : 'bg-slate-50'
      }`}
    >
      <td className="px-4 py-2.5">
        <p
          className={`text-sm font-bold m-0 leading-snug ${
            formato.activo ? 'text-slate-800' : 'text-gray-400 line-through'
          }`}
        >
          {formato.nombre}
        </p>
        <span className="text-[11px] text-slate-500">
          {formato.codigo} · versión {formato.version}
        </span>
      </td>

      <td className="px-4 py-2.5">
        <UsadoEn formato={formato} />
      </td>

      {/* Sin archivo el formato está declarado pero no se puede descargar: se
          dice, porque un botón que no baja nada se lee como un fallo. */}
      <td className="px-4 py-2.5">
        <EnlaceArchivo formato={formato} />
      </td>

      <td className="px-4 py-2.5">
        <BotonEstadoFormato formato={formato} onCambiarEstado={onCambiarEstado} />
      </td>

      {/* Con texto y no solo icono: «editar» es lo que se busca al llegar a
          esta columna, y un lápiz suelto obliga a deducirlo. El área supera
          los 44 px de alto que pide el tamaño mínimo de toque. */}
      <td className="px-4 py-2.5 text-right">
        <BotonEditarFormato formato={formato} onEditar={onEditar} />
      </td>
    </tr>
  );
}

/** El mismo formato de la tabla, apilado para la pantalla del teléfono. */
function TarjetaFormato({
  formato,
  onEditar,
  onCambiarEstado,
}: {
  formato: PlantillaFormato;
  onEditar: () => void;
  onCambiarEstado: () => void;
}) {
  return (
    <li className={`px-4 py-3 ${formato.activo ? '' : 'bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-sm font-bold m-0 leading-snug ${
              formato.activo ? 'text-slate-800' : 'text-gray-400 line-through'
            }`}
          >
            {formato.nombre}
          </p>
          <span className="text-[11px] text-slate-500">
            {formato.codigo} · versión {formato.version}
          </span>
        </div>
        <BotonEstadoFormato formato={formato} onCambiarEstado={onCambiarEstado} />
      </div>

      <div className="mt-2">
        <UsadoEn formato={formato} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <EnlaceArchivo formato={formato} />
        <BotonEditarFormato formato={formato} onEditar={onEditar} />
      </div>
    </li>
  );
}

/**
 * En qué actividades se pide el formato.
 *
 * Solo se lee: lo decide cada actividad al configurar sus documentos. Se dice
 * cuando ninguna lo usa, porque un formato vigente que nadie cita es uno que
 * el gestor nunca verá.
 */
function UsadoEn({ formato }: { formato: PlantillaFormato }) {
  const usos = formato.usadaEn ?? [];
  if (usos.length === 0) {
    return (
      <span
        title="Ninguna actividad lo pide, así que el gestor no lo ve"
        className="text-[11px] font-bold text-amber-700"
      >
        En ninguna actividad
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold text-slate-600 tabular-nums">
      {usos.map((n) => `Actividad ${n}`).join(' · ')}
    </span>
  );
}

/** Descarga el archivo, o dice por qué no hay nada que descargar. */
function EnlaceArchivo({ formato }: { formato: PlantillaFormato }) {
  return formato.archivoUrl ? (
    <a
      href={contratacionService.urlDescarga(formato.archivoUrl)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold text-[#003DA5] hover:bg-gray-100"
    >
      <Download className="w-3.5 h-3.5" />
      Descargar
    </a>
  ) : (
    <span
      title="El formato está registrado pero nadie subió el archivo"
      className="text-[11px] font-bold text-amber-700"
    >
      sin archivo
    </span>
  );
}

/** El estado lleva punto además de color: distinguir vigente de retirado
    solo por el tono deja fuera a quien no separa esos dos colores. */
function BotonEstadoFormato({
  formato,
  onCambiarEstado,
}: {
  formato: PlantillaFormato;
  onCambiarEstado: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCambiarEstado}
      aria-pressed={formato.activo}
      title={
        formato.activo
          ? 'El gestor lo ve. Pulsa para retirarlo.'
          : 'El gestor no lo ve. Pulsa para volver a ofrecerlo.'
      }
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors flex-shrink-0 ${
        formato.activo
          ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${
          formato.activo ? 'bg-[#003DA5]' : 'bg-gray-400'
        }`}
      />
      {formato.activo ? 'Vigente' : 'Retirado'}
    </button>
  );
}

function BotonEditarFormato({
  formato,
  onEditar,
}: {
  formato: PlantillaFormato;
  onEditar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEditar}
      aria-label={`Editar ${formato.nombre}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-[#003DA5] hover:text-[#003DA5]"
    >
      <Pencil className="w-3.5 h-3.5" />
      Editar
    </button>
  );
}
/**
 * El formulario de un formato, para darlo de alta o para corregirlo.
 *
 * Es el mismo en los dos casos porque son los mismos datos: al editar llegan
 * cargados y el archivo puede dejarse como está. Tener dos formularios distintos
 * obligaría a mantener dos veces las mismas reglas.
 *
 * La versión no se pide: la lleva el sistema, porque volver a subir un código
 * que ya existe significa que el SIG publicó una revisión. Dónde se pide y a
 * qué modalidades lo decide cada actividad al configurar sus documentos.
 */
function Formulario({
  formato,
  formatos,
  onListo,
  onCancelar,
}: {
  /** El formato que se corrige, o nada si es un alta. */
  formato?: PlantillaFormato;
  formatos: PlantillaFormato[];
  onListo: () => Promise<void>;
  onCancelar: () => void;
}) {
  const editando = formato !== undefined;
  const [codigo, setCodigo] = useState(formato?.codigo ?? '');
  const [nombre, setNombre] = useState(formato?.nombre ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al corregir, el archivo ya está: solo hace falta uno nuevo si se quiere
  // reemplazar el que se subió por equivocación.
  const archivoGuardado = formato?.archivoUrl ?? null;
  const yaTieneArchivo = archivoGuardado !== null;
  const listo =
    codigo.trim() !== '' && nombre.trim() !== '' && (editando || archivo !== null);

  // Si el código ya existe, esta subida es una revisión. Decirlo antes de
  // guardar evita la sorpresa de ver retirado el formato anterior.
  const previa = editando
    ? undefined
    : formatos
        .filter((f) => f.codigo.toLowerCase() === codigo.trim().toLowerCase())
        .sort((a, b) => Number(b.version) - Number(a.version))[0];

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;

    setGuardando(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append('codigo', codigo.trim());
      cuerpo.append('nombre', nombre.trim());
      if (archivo) cuerpo.append('file', archivo);

      if (editando) {
        await contratacionService.editarPlantilla(formato.id, cuerpo);
      } else {
        await contratacionService.guardarPlantilla(cuerpo);
      }
      await onListo();
      toast.success(
        editando
          ? 'Formato actualizado'
          : previa
            ? `Guardado como versión ${Number(previa.version) + 1}`
            : 'Formato subido',
      );
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar el formato');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancelar}
      title={editando ? 'Editar el formato' : 'Subir un formato del SIG'}
      description={
        editando
          ? `${formato.codigo} · versión ${formato.version}`
          : 'Quedará en la biblioteca y aparecerá en las actividades que lo pidan'
      }
      size="large"
      icon={<FileText className="w-5 h-5" />}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-nuevo-formato"
            disabled={guardando || !listo}
            // Se dice qué falta: un botón apagado sin explicación deja a quien
            // lo mira buscando el campo que se dejó vacío.
            title={listo ? undefined : 'Completa el código, el nombre y el documento'}
            className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando
              ? 'Guardando…'
              : editando
                ? 'Guardar cambios'
                : 'Subir formato'}
          </button>
        </div>
      }
    >
      <form id="form-nuevo-formato" onSubmit={enviar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Código del SIG"
            id="nuevo-formato-codigo"
            obligatorio
            ayuda="El que trae el formato en su encabezado."
          >
            <input
              id="nuevo-formato-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              maxLength={40}
              placeholder="BS-FO-047"
              className={CLASE_ENTRADA}
            />
          </Campo>

          <div className="sm:col-span-2">
            <Campo
              etiqueta="Nombre del formato"
              id="nuevo-formato-nombre"
              obligatorio
              ayuda="Como lo verá el gestor en su actividad."
            >
              <input
                id="nuevo-formato-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={400}
                placeholder="Aviso de convocatoria"
                className={CLASE_ENTRADA}
              />
            </Campo>
          </div>
        </div>

        {previa && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-[#003DA5] bg-[#E0EDFF] px-3 py-2 text-[11px] text-gray-800 m-0"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#003DA5]" />
            <span>
              Ya existe un <strong className="font-bold">{previa.codigo}</strong> en versión{' '}
              {previa.version}. Este pasará a ser la versión{' '}
              <strong className="font-bold">{Number(previa.version) + 1}</strong>, y el
              gestor dejará de ver el anterior.
            </span>
          </p>
        )}

        {/* Tres situaciones distintas: un archivo recién elegido, el que ya
            estaba guardado, y ninguno. Solo la última es un aviso — editar el
            nombre de un formato no debería teñirse de amarillo por un archivo
            que está bien.

            El control nativo no se puede estilar, así que va oculto tras el
            botón, igual que en el resto del módulo. */}
        <div
          className={`rounded-lg border px-3.5 py-3 ${
            archivo
              ? 'border-emerald-200 bg-emerald-50'
              : yaTieneArchivo
                ? 'border-gray-200 bg-slate-50'
                : 'border-amber-300 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {archivo ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : yaTieneArchivo ? (
              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-bold m-0 ${
                  archivo
                    ? 'text-emerald-800'
                    : yaTieneArchivo
                      ? 'text-slate-700'
                      : 'text-amber-800'
                }`}
              >
                {archivo
                  ? archivo.name
                  : yaTieneArchivo
                    ? 'Documento cargado'
                    : 'Falta el documento'}
              </p>
              <p
                className={`text-[11px] m-0 mt-0.5 leading-snug ${
                  archivo
                    ? 'text-emerald-700'
                    : yaTieneArchivo
                      ? 'text-slate-500'
                      : 'text-amber-900'
                }`}
              >
                {archivo
                  ? 'Sustituirá al documento actual al guardar.'
                  : yaTieneArchivo
                    ? 'Es el que el gestor descarga para diligenciar.'
                    : 'Word, PDF o Excel · máximo 25 MB'}
              </p>

              {/* Verlo antes de sustituirlo: es la única forma de comprobar
                  que el documento cargado es el que se cree que es. */}
              {archivoGuardado && !archivo && (
                <a
                  href={contratacionService.urlDescarga(archivoGuardado)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 rounded text-[11px] font-bold text-[#003DA5] hover:underline"
                >
                  <Download className="w-3 h-3" />
                  Ver documento actual
                </a>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={EXTENSIONES}
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]
                font-extrabold rounded-md shadow-sm active:scale-95 transition-all ${
                  archivo || yaTieneArchivo
                    ? 'bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5]'
                    : 'bg-[#003DA5] text-white hover:bg-[#002e7d]'
                }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {archivo || yaTieneArchivo ? 'Cambiar archivo' : 'Elegir archivo'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Etiqueta y ayuda de un campo, con el mismo aire en toda la pantalla. */
function Campo({
  etiqueta,
  id,
  ayuda,
  obligatorio = false,
  children,
}: {
  etiqueta: string;
  id: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold text-gray-600 mb-1">
        {etiqueta}
        {/* El asterisco se marca como decorativo: el input ya lleva `required`,
            que es lo que anuncia el lector de pantalla. Leerlo dos veces
            convierte cada campo en «asterisco, obligatorio». */}
        {obligatorio && (
          <span aria-hidden="true" className="ml-1 text-red-600">
            *
          </span>
        )}
      </label>
      {children}
      {/* Persistente y no solo en el placeholder: el placeholder desaparece
          justo cuando se escribe, que es cuando la ayuda hace falta. */}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-[11px] text-gray-500 mt-1 mb-0">
          {ayuda}
        </p>
      )}
    </div>
  );
}
