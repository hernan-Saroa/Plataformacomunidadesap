import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  MapPin,
  Building2,
  Layers,
  Wrench,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  UploadCloud,
  File,
  Trash2,
  Link2,
  Monitor,
  Info,
} from 'lucide-react';
import {
  infraestructuraService,
  Sede,
  SolicitudMantenimiento,
  CreateMantenimientoPayload,
  CatalogoItem,
  SolicitudEvidencia,
  BloqueEdificio,
  EspacioFisico,
  DependenciaCatalogo,
} from '../services/infraestructuraService';

interface NuevaSolicitudFormProps {
  onClose: () => void;
  onExito: (solicitud: SolicitudMantenimiento) => void;
}

interface ArchivoPendiente {
  localId: string;
  file: File;
  preview?: string;
  progreso: number;
  error?: string;
  evidencia?: SolicitudEvidencia;
}

const TIPOS_MANTENIMIENTO_FALLBACK: CatalogoItem[] = [
  { idCatalogo: 1, catalogo: 'TIPO_MANTENIMIENTO', codigo: 'PREVENTIVO',   nombre: 'Preventivo',   orden: 1, isActivo: true, metadata: {} },
  { idCatalogo: 2, catalogo: 'TIPO_MANTENIMIENTO', codigo: 'CORRECTIVO',   nombre: 'Correctivo',   orden: 2, isActivo: true, metadata: {} },
  { idCatalogo: 3, catalogo: 'TIPO_MANTENIMIENTO', codigo: 'LOCATIVO',     nombre: 'Locativo',     orden: 3, isActivo: true, metadata: {} },
  { idCatalogo: 4, catalogo: 'TIPO_MANTENIMIENTO', codigo: 'TECNOLOGICO',  nombre: 'Tecnológico / TIC', orden: 4, isActivo: true, metadata: {} },
];

const PRIORIDADES_FALLBACK: CatalogoItem[] = [
  { idCatalogo: 1, catalogo: 'PRIORIDAD', codigo: 'BAJA',    nombre: 'Baja',    orden: 1, isActivo: true, metadata: {} },
  { idCatalogo: 2, catalogo: 'PRIORIDAD', codigo: 'MEDIA',   nombre: 'Media',   orden: 2, isActivo: true, metadata: {} },
  { idCatalogo: 3, catalogo: 'PRIORIDAD', codigo: 'ALTA',    nombre: 'Alta',    orden: 3, isActivo: true, metadata: {} },
  { idCatalogo: 4, catalogo: 'PRIORIDAD', codigo: 'URGENTE', nombre: 'Urgente', orden: 4, isActivo: true, metadata: {} },
];

const ES_IMAGEN = (m?: string) => /^image\//i.test(m || '');
const TAMANO_HUMANO = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

export const NuevaSolicitudForm: React.FC<NuevaSolicitudFormProps> = ({ onClose, onExito }) => {
  const [sedesAlcance, setSedesAlcance] = useState<Sede[]>([]);
  const [cargandoSedes, setCargandoSedes] = useState<boolean>(true);

  const [catalogoTM, setCatalogoTM] = useState<CatalogoItem[]>([]);
  const [catalogoPR, setCatalogoPR] = useState<CatalogoItem[]>([]);
  const [catalogoCS, setCatalogoCS] = useState<CatalogoItem[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState<boolean>(true);

  const [dependencias, setDependencias] = useState<DependenciaCatalogo[]>([]);
  const [cargandoDependencias, setCargandoDependencias] = useState<boolean>(true);

  const [tipoAtencion, setTipoAtencion] = useState<'FISICA' | 'TECNOLOGICA' | ''>('');
  const [idSede, setIdSede] = useState<string>('');
  const [idBloque, setIdBloque] = useState<string>('');
  const [idEspacio, setIdEspacio] = useState<string>('');
  const [ubicacionManual, setUbicacionManual] = useState<boolean>(false);
  const [espaciosDelBloque, setEspaciosDelBloque] = useState<EspacioFisico[]>([]);
  const [cargandoEspacios, setCargandoEspacios] = useState<boolean>(false);

  const [nombreAreaSolicitante, setNombreAreaSolicitante] = useState<string>('');
  const [piso, setPiso] = useState<string>('');
  const [salon, setSalon] = useState<string>('');
  const [ubicacionDetalle, setUbicacionDetalle] = useState<string>('');
  const [tipoMantenimiento, setTipoMantenimiento] = useState<string>('CORRECTIVO');
  const [idCategoria, setIdCategoria] = useState<number | undefined>(undefined);
  const [idSubcategoria, setIdSubcategoria] = useState<number | undefined>(undefined);
  const [prioridad, setPrioridad] = useState<string>('MEDIA');
  const [descripcion, setDescripcion] = useState<string>('');
  const [evidenciaInicialUrl, setEvidenciaInicialUrl] = useState<string>('');

  const [archivos, setArchivos] = useState<ArchivoPendiente[]>([]);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const [subeFiles, setSubeFiles] = useState<boolean>(false);

  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string>('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const dependenciasFiltradas = useMemo(() => {
    if (!idSede) return dependencias;
    return dependencias.filter(
      (d) =>
        d.sedeUmiId === idSede ||
        (d.sedeUmiId == null && (d.idSede == null || String(d.idSede) === '1')),
    );
  }, [dependencias, idSede]);

  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        setCargandoSedes(true);
        setCargandoCatalogos(true);
        setCargandoDependencias(true);
        const [listadoSedes, tm, pr, cs, deps] = await Promise.all([
          infraestructuraService.getSedesAlcanceUMI(),
          infraestructuraService.getCatalogo('TIPO_MANTENIMIENTO'),
          infraestructuraService.getCatalogo('PRIORIDAD'),
          infraestructuraService.getCatalogo('CATEGORIA_SERVICIO'),
          infraestructuraService.getDependenciasCatalogo(),
        ]);
        setSedesAlcance(listadoSedes);
        setCatalogoCS(cs.length > 0 ? cs : []);
        setDependencias(Array.isArray(deps) && deps.length > 0 ? deps : []);
        if (listadoSedes.length === 1) {
          setIdSede(listadoSedes[0].idSede);
        }
        // TIPO_MANTENIMIENTO: priorizar TM real. Si el endpoint devolvió vacío
        // (error o catalogo paramétrico no poblado) caemos al fallback LOCAL
        // (PREVENTIVO/CORRECTIVO/LOCATIVO/TECNOLOGICO) y elegimos CORRECTIVO
        // por defecto. NUNCA usar PR aquí (ni BAJA/MEDIA/ALTA/URGENTE) porque
        // TIPO y PRIORIDAD son dimensiones distintas (mix bug reproducible
        // cuando algún script de seed/populate dejó TIPO_MANTENIMIENTO sin filas).
        if (tm.length > 0) {
          const defaultTM = tm.find((x) => x.codigo === 'CORRECTIVO') ?? tm[0];
          setCatalogoTM(tm);
          setTipoMantenimiento(defaultTM.codigo);
        } else {
          setCatalogoTM(TIPOS_MANTENIMIENTO_FALLBACK);
          setTipoMantenimiento('CORRECTIVO');
        }
        // PRIORIDAD: independiente al TM. Fallback si el catálogo real vino vacío.
        if (pr.length > 0) {
          const defaultPR = pr.find((x) => x.codigo === 'MEDIA') ?? pr[0];
          setCatalogoPR(pr);
          setPrioridad(defaultPR.codigo);
        } else {
          setCatalogoPR(PRIORIDADES_FALLBACK);
          setPrioridad('MEDIA');
        }
      } catch (err: any) {
        console.error('No se pudieron cargar sedes/catalogos UMI', err);
        setCatalogoTM(TIPOS_MANTENIMIENTO_FALLBACK);
        setCatalogoPR(PRIORIDADES_FALLBACK);
        setCatalogoCS([]);
        setDependencias([]);
        // (EFDS-1732) En modo catch/fallback: valores default semánticamente
        // correctos, TIPO != PRIORIDAD (fix bug "Urgente" aparecía en Tipo Mto.)
        setTipoMantenimiento('CORRECTIVO');
        setPrioridad('MEDIA');
      } finally {
        setCargandoSedes(false);
        setCargandoCatalogos(false);
        setCargandoDependencias(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sedeSeleccionada = useMemo(
    () => sedesAlcance.find((s) => s.idSede === idSede) ?? null,
    [sedesAlcance, idSede],
  );
  const bloquesSedeSeleccionada: BloqueEdificio[] = useMemo(
    () => (sedeSeleccionada?.bloques ?? []).filter((b) => b.isActivo !== false),
    [sedeSeleccionada],
  );
  const bloqueSeleccionado: BloqueEdificio | null | undefined = useMemo(
    () => bloquesSedeSeleccionada.find((b) => b.idBloque === idBloque),
    [bloquesSedeSeleccionada, idBloque],
  );
  const espacioSeleccionado: EspacioFisico | null | undefined = useMemo(
    () => espaciosDelBloque.find((e) => e.idEspacio === idEspacio),
    [espaciosDelBloque, idEspacio],
  );

  // (EFDS-1732) Reset selectores dependientes al cambiar la sede
  useEffect(() => {
    setIdBloque('');
    setIdEspacio('');
    setEspaciosDelBloque([]);
    if (!ubicacionManual) {
      setPiso('');
      setSalon('');
    }
  }, [idSede]); // eslint-disable-line react-hooks/exhaustive-deps

  // (EFDS-1732) Cargar espacios cuando el usuario elige bloque (modo guiado)
  useEffect(() => {
    if (ubicacionManual) {
      setEspaciosDelBloque([]);
      setIdEspacio('');
      return;
    }
    if (!idBloque) {
      setEspaciosDelBloque([]);
      setIdEspacio('');
      setPiso('');
      setSalon('');
      return;
    }
    let cancelled = false;
    (async () => {
      setCargandoEspacios(true);
      try {
        const listado = await infraestructuraService.getEspacios({ idBloque });
        if (!cancelled) {
          setEspaciosDelBloque(listado.filter((e) => e.isActivo !== false));
        }
      } finally {
        if (!cancelled) setCargandoEspacios(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idBloque, ubicacionManual]);

  // (EFDS-1732) Autollenar piso / salon desde espacio elegido (modo guiado)
  useEffect(() => {
    if (ubicacionManual) return;
    if (!espacioSeleccionado) {
      if (idEspacio === '') {
        // no limpiar si el usuario borro manualmente por UX
      }
      return;
    }
    const p = espacioSeleccionado.piso;
    setPiso(p === 0 ? 'PB' : String(p));
    setSalon(espacioSeleccionado.nombre || espacioSeleccionado.codigo || '');
  }, [espacioSeleccionado, ubicacionManual, idEspacio]);

  // (EFDS-1732) Toggle modo manual → limpia selectores guiados o viceversa
  useEffect(() => {
    if (ubicacionManual) {
      setIdEspacio('');
      setEspaciosDelBloque([]);
    } else {
      if (espacioSeleccionado) {
        const p = espacioSeleccionado.piso;
        setPiso(p === 0 ? 'PB' : String(p));
        setSalon(espacioSeleccionado.nombre || espacioSeleccionado.codigo || '');
      }
    }
  }, [ubicacionManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const listaTM = catalogoTM.length > 0 ? catalogoTM : TIPOS_MANTENIMIENTO_FALLBACK;
  const listaPR = catalogoPR.length > 0 ? catalogoPR : PRIORIDADES_FALLBACK;
  const categoriasPrincipales = useMemo(
    () => catalogoCS.filter((c) => c.metadata?.tipo === 'CATEGORIA_PRINCIPAL').sort((a, b) => a.orden - b.orden),
    [catalogoCS],
  );
  const subcategorias = useMemo(() => {
    if (!Number.isInteger(idCategoria) || !(idCategoria as number)) return [];
    const catPadre = catalogoCS.find((c) => c.idCatalogo === idCategoria);
    const parentCodigo = catPadre?.codigo;
    if (!parentCodigo) return [];
    return catalogoCS
      .filter((c) => c.metadata?.parentCodigo === parentCodigo && c.metadata?.tipo === 'SUBCATEGORIA')
      .sort((a, b) => a.orden - b.orden);
  }, [idCategoria, catalogoCS]);

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {};
    if (!tipoAtencion) nuevosErrores.tipoAtencion = 'Seleccione el tipo de atención (Física o Tecnológica)';
    if (!idSede) nuevosErrores.idSede = 'Seleccione la sede';
    if (!nombreAreaSolicitante.trim() || nombreAreaSolicitante.trim().length < 3) {
      nuevosErrores.nombreAreaSolicitante = 'Ingrese el nombre del área solicitante (mínimo 3 caracteres)';
    }
    if (ubicacionManual) {
      if (!piso.trim()) nuevosErrores.piso = 'Ingrese el piso';
      if (!salon.trim()) nuevosErrores.salon = 'Ingrese el salón, oficina o ubicación';
    } else {
      if (!idBloque) nuevosErrores.idBloque = 'Seleccione el bloque o edificio';
      if (!idEspacio) nuevosErrores.idEspacio = 'Seleccione el espacio físico (aula, oficina, laboratorio...)';
    }
    if (!tipoMantenimiento) nuevosErrores.tipoMantenimiento = 'Seleccione un tipo de mantenimiento';
    if (!descripcion.trim() || descripcion.trim().length < 10) {
      nuevosErrores.descripcion = 'Describa la solicitud con al menos 10 caracteres';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const agregarFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => {
      const permitido =
        /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i.test(f.type) ||
        /\.(png|jpe?g|gif|webp|heic|heif|pdf)$/i.test(f.name);
      if (!permitido) {
        setErrorMensaje(
          `Archivo "${f.name}" no permitido. Solo imágenes (PNG/JPG/HEIC/WEBP) o PDF, hasta 20MB cada uno.`,
        );
        setTimeout(() => setErrorMensaje((prev) => (prev.includes(f.name) ? '' : prev)), 6000);
      }
      if (f.size > 20 * 1024 * 1024) {
        setErrorMensaje(`Archivo "${f.name}" excede los 20MB.`);
        return false;
      }
      return permitido;
    });
    const pendientes: ArchivoPendiente[] = arr.map((f) => ({
      localId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      progreso: 0,
      preview: ES_IMAGEN(f.type) ? URL.createObjectURL(f) : undefined,
    }));
    setArchivos((prev) => [...prev, ...pendientes]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      agregarFiles(e.dataTransfer.files);
    }
  };

  const removerArchivo = (localId: string) => {
    setArchivos((prev) => {
      const f = prev.find((x) => x.localId === localId);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.localId !== localId);
    });
  };

  const subirArchivos = async () => {
    if (archivos.length === 0) return [];
    setSubeFiles(true);
    try {
      const resultados: SolicitudEvidencia[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const a = archivos[i];
        if (a.evidencia) {
          resultados.push(a.evidencia);
          continue;
        }
        try {
          const uploaded = await infraestructuraService.uploadEvidencia(a.file, {
            orden: i + 1,
            onProgress: (p) => {
              setArchivos((prev) =>
                prev.map((x) => (x.localId === a.localId ? { ...x, progreso: p } : x)),
              );
            },
          });
          setArchivos((prev) =>
            prev.map((x) => (x.localId === a.localId ? { ...x, progreso: 100, evidencia: uploaded } : x)),
          );
          resultados.push(uploaded);
        } catch (err: any) {
          setArchivos((prev) =>
            prev.map((x) =>
              x.localId === a.localId
                ? { ...x, progreso: 0, error: err?.message || 'No se pudo subir' }
                : x,
            ),
          );
          throw err;
        }
      }
      return resultados;
    } finally {
      setSubeFiles(false);
    }
  };

  const manejarEnvio = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setErrorMensaje('');
    if (!validar()) return;
    setEnviando(true);
    try {
      let evidenciasSubidas: SolicitudEvidencia[] = [];
      if (archivos.filter((a) => !a.evidencia).length > 0 || archivos.length > 0) {
        evidenciasSubidas = await subirArchivos();
      }
      const conErrores = archivos.find((a) => a.error);
      if (conErrores) {
        throw new Error(
          `No se pudo subir el archivo ${conErrores.file.name}: ${conErrores.error}. Intente nuevamente o remuévalo.`,
        );
      }
      const uploadedEvidenciaIds = Array.from(
        new Set([
          ...evidenciasSubidas.map((e) => e.idEvidencia),
          ...archivos.flatMap((a) => (a.evidencia?.idEvidencia ? [a.evidencia.idEvidencia] : [])),
        ]),
      ).filter((x): x is string => !!x);
      const payload: CreateMantenimientoPayload = {
        idSede,
        idEspacio: !ubicacionManual && idEspacio ? idEspacio : undefined,
        nombreAreaSolicitante: nombreAreaSolicitante.trim(),
        piso: piso.trim(),
        salon: salon.trim(),
        ubicacionDetalle: ubicacionDetalle.trim() || undefined,
        tipoMantenimiento,
        prioridad,
        idCategoria: Number.isInteger(idCategoria) ? idCategoria : undefined,
        idSubcategoria: Number.isInteger(idSubcategoria) ? idSubcategoria : undefined,
        descripcion: descripcion.trim(),
        evidenciaInicialUrl: evidenciaInicialUrl.trim() || undefined,
        uploadedEvidenciaIds: uploadedEvidenciaIds.length > 0 ? uploadedEvidenciaIds : undefined,
        tipoAtencion: tipoAtencion as 'FISICA' | 'TECNOLOGICA',
      };
      const resultado = await infraestructuraService.createMantenimiento(payload);
      archivos.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
      onExito(resultado);
    } catch (err: any) {
      setErrorMensaje(err?.message || 'No se pudo radicar la solicitud. Intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const totalSubidosOk = useMemo(
    () => archivos.filter((a) => !!a.evidencia).length,
    [archivos],
  );

  const inputClase = (campo: string) =>
    `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 ${
      errores[campo]
        ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
        : 'border-slate-200 focus:ring-amber-200 focus:border-amber-500'
    }`;

  const labelClase = 'block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando && !subeFiles) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Radicar Solicitud de Mantenimiento"
    >
      <div
        style={{
          position: 'fixed',
          top: 128,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '95vw',
          maxWidth: 960,
          height: 'calc(100vh - 160px)',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 h-full">

        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Radicar Solicitud de Mantenimiento
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestión de Infraestructura UMI — Sede Central y Sedes Alternas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {errorMensaje && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold mb-0.5">No se pudo radicar la solicitud</p>
                  <p>{errorMensaje}</p>
                </div>
              </div>
            )}

            <div>
              <label className={labelClase}>
                <span className="inline-flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  Clasificación de la Atención
                </span>
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAtencion('FISICA')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    tipoAtencion === 'FISICA'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200'
                      : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/30'
                  } ${errores.tipoAtencion ? 'border-rose-300' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tipoAtencion === 'FISICA' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Atención Física / Infraestructura
                      {tipoAtencion === 'FISICA' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">
                      Locativo, pintura, plomería, carpintería, electricidad básica, vidrios, acústica, mobiliario, daños en salones o aulas.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoAtencion('TECNOLOGICA')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    tipoAtencion === 'TECNOLOGICA'
                      ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-200'
                      : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/30'
                  } ${errores.tipoAtencion ? 'border-rose-300' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tipoAtencion === 'TECNOLOGICA' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Atención Tecnológica / TIC
                      {tipoAtencion === 'TECNOLOGICA' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">
                      Computadores, impresoras, red, WiFi, videobeam, pizarras digitales, software, correos, cuentas, plataformas, audio, CCTV.
                    </div>
                  </div>
                </button>
              </div>
              {errores.tipoAtencion && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errores.tipoAtencion}
                </p>
              )}
            </div>

            {tipoAtencion === 'TECNOLOGICA' && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-sky-200 bg-sky-50 text-sky-900">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-sky-600" />
                <div className="text-sm">
                  <p className="font-bold mb-0.5">Su solicitud será remitida a la Oficina de Tecnologías de la Información</p>
                  <p className="opacity-90">
                    Clasificaste el incidente como <strong>Tecnológico / TIC</strong>. El sistema lo remitirá automáticamente a la oficina de TI; la
                    Unidad de Mantenimiento UMI hará la trazabilidad de la remisión y el seguimiento final de cierre.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Sede
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={idSede}
                  onChange={(e) => {
                    const nuevaSede = e.target.value;
                    setIdSede(nuevaSede);
                    if (nuevaSede && nombreAreaSolicitante) {
                      const filtrada = dependencias.find((d) => d.nomDependencia === nombreAreaSolicitante);
                      if (filtrada && filtrada.sedeUmiId && filtrada.sedeUmiId !== nuevaSede) {
                        setNombreAreaSolicitante('');
                      }
                    }
                  }}
                  disabled={cargandoSedes}
                  className={inputClase('idSede')}
                >
                  <option value="">{cargandoSedes ? 'Cargando sedes...' : 'Seleccione una sede'}</option>
                  {sedesAlcance.map((s) => (
                    <option key={s.idSede} value={s.idSede}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {errores.idSede && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.idSede}</p>}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Área solicitante
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={nombreAreaSolicitante}
                  onChange={(e) => setNombreAreaSolicitante(e.target.value)}
                  disabled={cargandoDependencias}
                  className={inputClase('nombreAreaSolicitante')}
                >
                  <option value="">
                    {cargandoDependencias
                      ? 'Cargando catálogo de dependencias...'
                      : dependenciasFiltradas.length === 0
                      ? idSede
                        ? 'La sede seleccionada no tiene dependencias asociadas aún'
                        : 'No hay dependencias disponibles en el catálogo'
                      : 'Seleccione la dependencia o área solicitante'}
                  </option>
                  {dependenciasFiltradas.map((d) => (
                    <option key={`dep-${d.idDependencia}`} value={d.nomDependencia}>
                      [{d.codDependencia}] {d.nomDependencia}
                      {d.sedeNombre ? ` · ${d.sedeNombre}` : ''}
                    </option>
                  ))}
                </select>
                {errores.nombreAreaSolicitante && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errores.nombreAreaSolicitante}</p>
                )}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Bloque / Edificio
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={idBloque}
                  onChange={(e) => setIdBloque(e.target.value)}
                  disabled={ubicacionManual || cargandoSedes || !idSede}
                  className={inputClase('idBloque')}
                >
                  <option value="">
                    {ubicacionManual
                      ? 'Ubicación manual activada'
                      : !idSede
                      ? 'Primero seleccione la sede'
                      : bloquesSedeSeleccionada.length === 0
                      ? 'No hay bloques registrados para esta sede'
                      : 'Seleccione el bloque o edificio'}
                  </option>
                  {bloquesSedeSeleccionada.map((b) => (
                    <option key={b.idBloque} value={b.idBloque}>
                      [{b.codigo}] {b.nombre} {b.pisos > 1 ? `· ${b.pisos} pisos` : ''}
                    </option>
                  ))}
                </select>
                {errores.idBloque && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.idBloque}</p>}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Espacio físico (aula / oficina / lab)
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={idEspacio}
                  onChange={(e) => setIdEspacio(e.target.value)}
                  disabled={ubicacionManual || !idBloque || cargandoEspacios}
                  className={inputClase('idEspacio')}
                >
                  <option value="">
                    {ubicacionManual
                      ? 'Ubicación manual activada'
                      : !idBloque
                      ? 'Primero seleccione el bloque'
                      : cargandoEspacios
                      ? 'Cargando espacios del bloque...'
                      : espaciosDelBloque.length === 0
                      ? 'No hay espacios registrados en este bloque'
                      : 'Seleccione el espacio'}
                  </option>
                  {espaciosDelBloque.map((e) => (
                    <option key={e.idEspacio} value={e.idEspacio}>
                      [{e.codigo}] {e.nombre} · {e.tipo} · P{e.piso === 0 ? 'B' : e.piso} {e.capacidad ? `· Cap ${e.capacidad}` : ''}
                    </option>
                  ))}
                </select>
                {errores.idEspacio && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.idEspacio}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-start gap-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ubicacionManual}
                    onChange={(e) => setUbicacionManual(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-600"
                  />
                  <span className="text-xs">
                    <span className="font-bold text-slate-800">No encuentro mi espacio</span>
                    <span className="text-slate-500">
                      {' '}· Actívalo solo si tu bloque, aula u oficina NO aparecen en los desplegables. En ese caso ingresa manualmente el piso y salón.
                    </span>
                  </span>
                </label>
              </div>

              {ubicacionManual && (
                <>
                  <div>
                    <label className={labelClase}>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Piso / Nivel
                      </span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={piso}
                      onChange={(e) => setPiso(e.target.value)}
                      placeholder="Ej: 1, 2, 3, 5, PB, Mezzanine"
                      className={inputClase('piso')}
                    />
                    {errores.piso && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.piso}</p>}
                  </div>

                  <div>
                    <label className={labelClase}>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Salón / Oficina
                      </span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={salon}
                      onChange={(e) => setSalon(e.target.value)}
                      placeholder="Ej: Aula 204, Oficina 301, Auditorio Principal"
                      className={inputClase('salon')}
                    />
                    {errores.salon && <p className="mt-1 text-xs text-rose-600 font-medium">{errores.salon}</p>}
                  </div>
                </>
              )}

              {!ubicacionManual && idEspacio && (
                <>
                  <div>
                    <label className={labelClase}>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Piso / Nivel
                      </span>
                    </label>
                    <input
                      type="text"
                      value={piso}
                      readOnly
                      placeholder="Automático según el espacio elegido"
                      className={`${inputClase('piso')} bg-slate-50/40`}
                    />
                  </div>

                  <div>
                    <label className={labelClase}>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Salón / Oficina
                      </span>
                    </label>
                    <input
                      type="text"
                      value={salon}
                      readOnly
                      placeholder="Automático según el espacio elegido"
                      className={`${inputClase('salon')} bg-slate-50/40`}
                    />
                  </div>
                </>
              )}

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Tipo de mantenimiento
                  </span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <select
                  value={tipoMantenimiento}
                  onChange={(e) => setTipoMantenimiento(e.target.value)}
                  disabled={cargandoCatalogos}
                  className={inputClase('tipoMantenimiento')}
                >
                  {listaTM.map((t) => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {errores.tipoMantenimiento && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errores.tipoMantenimiento}</p>
                )}
              </div>

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Categoría de servicio
                  </span>
                  <span className="text-slate-400 font-normal ml-2">(opcional fase 2)</span>
                </label>
                <select
                  value={idCategoria ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setIdCategoria(undefined);
                      setIdSubcategoria(undefined);
                    } else {
                      const parsed = Number(val);
                      setIdCategoria(Number.isInteger(parsed) ? parsed : undefined);
                      setIdSubcategoria(undefined);
                    }
                  }}
                  disabled={cargandoCatalogos}
                  className={inputClase('idCategoria')}
                >
                  <option value="">-- Seleccione una categoría (opcional) --</option>
                  {categoriasPrincipales.map((c) => {
                    const requiereCoord = !!(c as any).metadata?.requiereCoordinador;
                    return (
                      <option
                        key={c.idCatalogo}
                        value={c.idCatalogo}
                        title={requiereCoord ? 'ATENCIÓN: Esta categoría requiere confirmación ESCRITA del Coordinador UMI antes de radicar.' : c.descripcion || ''}
                      >
                        [{c.codigo}] {c.nombre}{requiereCoord ? '  ⚠' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              {(() => {
                if (!Number.isInteger(idCategoria)) return null;
                const sel = categoriasPrincipales.find((c) => c.idCatalogo === idCategoria);
                const requiereCoord = !!(sel as any)?.metadata?.requiereCoordinador;
                if (!requiereCoord) return null;
                return (
                  <div className="md:col-span-2 flex items-start gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-[11px] text-fuchsia-900 font-semibold">
                    <AlertCircle className="w-4 h-4 text-fuchsia-700 flex-shrink-0 mt-0.5" />
                    <div>
                      Esta categoría ({sel?.codigo}) requiere <strong>confirmación ESCRITA del Coordinador del Módulo</strong> antes de ser clasificada aquí. Incluye: UPS, plantas eléctricas, CCTV, control de acceso, detección de incendios y equipos industriales críticos. Si no tienes el aval, deja categoría sin seleccionar y UMI la asignará en bandeja.
                    </div>
                  </div>
                );
              })()}

              {subcategorias.length > 0 && (
                <div>
                  <label className={labelClase}>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Subcategoría
                    </span>
                    <span className="text-slate-400 font-normal ml-2">(opcional)</span>
                  </label>
                  <select
                    value={idSubcategoria ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setIdSubcategoria(undefined);
                      else {
                        const parsed = Number(val);
                        setIdSubcategoria(Number.isInteger(parsed) ? parsed : undefined);
                      }
                    }}
                    disabled={cargandoCatalogos || !Number.isInteger(idCategoria)}
                    className={inputClase('idSubcategoria')}
                  >
                    <option value="">-- Ninguna / Clasificación genérica --</option>
                    {subcategorias.map((s) => (
                      <option key={s.idCatalogo} value={s.idCatalogo}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    Prioridad
                  </span>
                </label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  disabled={cargandoCatalogos}
                  className={inputClase('prioridad')}
                >
                  {listaPR.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  Detalle adicional de ubicación
                  <span className="text-slate-400 font-normal ml-2">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ubicacionDetalle}
                  onChange={(e) => setUbicacionDetalle(e.target.value)}
                  placeholder="Ej: Frente al ascensor, Edificio A, al lado de la biblioteca..."
                  className={inputClase('ubicacionDetalle')}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  Descripción de la solicitud
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <textarea
                  rows={5}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describa detalladamente la novedad: síntoma, momento en que se detectó, personas afectadas, intentos de solución, etc."
                  className={`${inputClase('descripcion')} resize-none leading-relaxed`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">Mínimo 10 caracteres</p>
                  {errores.descripcion ? (
                    <p className="text-xs text-rose-600 font-medium">{errores.descripcion}</p>
                  ) : (
                    <p className="text-xs text-slate-400">{descripcion.length} caracteres</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5 text-slate-400" />
                    Adjuntar evidencias
                  </span>
                  <span className="text-slate-400 font-normal ml-2">
                    (opcional — imágenes PNG/JPG/HEIC/WEBP o PDF, hasta 20MB cada uno)
                  </span>
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                  }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={onDrop}
                  onClick={() => inputFileRef.current?.click()}
                  className={`group cursor-pointer select-none rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-all ${
                    arrastrando
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-amber-400'
                  }`}
                >
                  <UploadCloud
                    className={`mx-auto mb-2 transition-all ${
                      arrastrando ? 'text-amber-600 scale-110' : 'text-slate-400 group-hover:text-amber-500'
                    }`}
                    style={{ width: 36, height: 36 }}
                  />
                  <p className="text-sm font-semibold text-slate-700">
                    Arrastra tus archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {archivos.length === 0
                      ? 'Adjunta fotos, planos, recibos o PDF de soporte a la solicitud'
                      : `${archivos.length} archivo(s) seleccionados · ${totalSubidosOk}/${archivos.length} subido(s) OK`}
                  </p>
                  <input
                    ref={inputFileRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files && agregarFiles(e.target.files)}
                  />
                </div>

                {archivos.length > 0 && (
                  <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {archivos.map((a) => (
                      <li
                        key={a.localId}
                        className={`relative rounded-xl border bg-white p-2 text-xs shadow-sm ${
                          a.error
                            ? 'border-rose-300'
                            : a.evidencia
                            ? 'border-emerald-300 bg-emerald-50/40'
                            : subeFiles
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                          {a.preview ? (
                            <img
                              src={a.preview}
                              alt={a.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-500 p-2">
                              <File style={{ width: 22, height: 22 }} />
                              <span className="font-medium line-clamp-2 text-center">{a.file.name.split('.').pop()?.toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-slate-700 line-clamp-1" title={a.file.name}>
                          {a.file.name}
                        </p>
                        <p className="text-slate-500 mb-1">{TAMANO_HUMANO(a.file.size)}</p>
                        {subeFiles && !a.evidencia && !a.error ? (
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${a.progreso}%` }}
                            />
                          </div>
                        ) : a.error ? (
                          <p className="text-rose-600 font-medium">{a.error}</p>
                        ) : a.evidencia ? (
                          <p className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 style={{ width: 12, height: 12 }} /> Subido OK
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!enviando && !subeFiles) removerArchivo(a.localId);
                          }}
                          disabled={enviando || subeFiles}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-colors disabled:opacity-50"
                          aria-label="Quitar archivo"
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="md:col-span-2">
                <label className={labelClase}>
                  <span className="inline-flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                    URL de evidencia (opcional legacy)
                  </span>
                </label>
                <input
                  type="text"
                  value={evidenciaInicialUrl}
                  onChange={(e) => setEvidenciaInicialUrl(e.target.value)}
                  placeholder="Alternativa: pega aquí una URL externa (Drive, Dropbox, etc.)"
                  className={inputClase('evidenciaInicialUrl')}
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 space-y-1">
                <p className="font-bold">Antes de radicar</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                  <li>El consecutivo, fecha y hora de radicación se generan automáticamente en el servidor.</li>
                  <li>Su solicitud quedará en estado <strong>RECIBIDA</strong> y será analizada por el equipo UMI.</li>
                  <li>Podrá consultar el estado en la sección <strong>Mis Solicitudes</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando || subeFiles}
            onClick={manejarEnvio}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
          >
            {enviando || subeFiles ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                {subeFiles && !enviando ? `Subiendo archivos ${totalSubidosOk}/${archivos.length}...` : 'Radicando...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Radicar solicitud
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
