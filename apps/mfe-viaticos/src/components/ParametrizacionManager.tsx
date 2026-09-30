import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Layers,
  Settings,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Plane,
  ChevronUp,
  ChevronDown,
  Upload,
  Copy,
  Check,
  FileText,
  HelpCircle,
  Info,
  Sparkles,
  Search,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import {
  CampoFormulario,
  ConfigTipoComisionado,
  TipoDocumentoSoporte,
  CrearCampoFormularioDTO,
  ActualizarCampoFormularioDTO,
  CrearConfigTipoComisionadoDTO,
  ActualizarConfigTipoComisionadoDTO,
  CrearTipoDocumentoSoporteDTO,
  ActualizarTipoDocumentoSoporteDTO,
  TipoCampoFormulario,
  GrupoCampoFormulario,
} from '../types/parametrizacion';
import EscalasViaticosAdmin from './admin/EscalasViaticosAdmin';
import TarifasInvestigadorAdmin from './admin/TarifasInvestigadorAdmin';
import TarifasTransporteTerminalAdmin from './admin/TarifasTransporteTerminalAdmin';
import ParametrosLiquidacionAdmin from './admin/ParametrosLiquidacionAdmin';
import TicketsAdminPanel from './admin/TicketsAdminPanel';
// Dependencias se gestiona desde el shell (Configuración General > Dependencias)
// y NO se renderiza como tab aquí para evitar duplicación con el menú global.

type TabActiva = 'campos' | 'documentos' | 'configuraciones' | 'escalas' | 'tarifas' | 'terminalesAereos' | 'parametros' | 'tiquetes';

const TIPOS_CAMPO: TipoCampoFormulario[] = ['TEXT', 'TEXTAREA', 'SELECT', 'DATE', 'NUMBER', 'BOOLEAN', 'CURRENCY', 'DOCUMENT'];
const GRUPOS_CAMPO: GrupoCampoFormulario[] = ['comisionado', 'comision', 'valores', 'soportes'];
const TIPOS_COMISIONADO = ['FUNCIONARIO', 'CONTRATISTA', 'DOCENTE', 'ESTUDIANTE', 'INVESTIGADOR', 'DEFAULT'];

interface CampoFormularioEstado {
  id?: string;
  clave: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormulario;
  placeholder: string;
  grupo: GrupoCampoFormulario | null;
  orden: number;
  activo: boolean;
  opciones: Array<{ value: string; label: string }>;
}

interface TipoDocumentoSoporteEstado {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  instruccionesValidacion: string;
  activo: boolean;
}

const docVacio = (): TipoDocumentoSoporteEstado => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  instruccionesValidacion: '',
  activo: true,
});

const campoVacio = (): CampoFormularioEstado => ({
  clave: '',
  etiqueta: '',
  tipoCampo: 'TEXT',
  placeholder: '',
  grupo: null,
  orden: 0,
  activo: true,
  opciones: [],
});

interface ConfigFormularioEstado {
  tipoComisionado: string;
  codigoFormulario: string;
  camposObligatorios: string[];
  camposOpcionales: string[];
  camposOcultos: string[];
  documentosObligatorios: string[];
  documentosOpcionales: string[];
  activo: boolean;
}

const configVacia = (): ConfigFormularioEstado => ({
  tipoComisionado: '',
  codigoFormulario: '',
  camposObligatorios: [],
  camposOpcionales: [],
  camposOcultos: [],
  documentosObligatorios: [],
  documentosOpcionales: [],
  activo: true,
});

export default function ParametrizacionManager() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('campos');
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [configuraciones, setConfiguraciones] = useState<ConfigTipoComisionado[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoSoporte[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [modalCampoAbierto, setModalCampoAbierto] = useState(false);
  const [campoEditando, setCampoEditando] = useState<CampoFormularioEstado | null>(null);
  const [campoGuardando, setCampoGuardando] = useState(false);

  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [configEditando, setConfigEditando] = useState<ConfigFormularioEstado | null>(null);
  const [configGuardando, setConfigGuardando] = useState(false);
  const [configEsNueva, setConfigEsNueva] = useState(false);

  const [campoAEliminar, setCampoAEliminar] = useState<CampoFormulario | null>(null);

  // Estados para documentos soporte
  const [modalDocAbierto, setModalDocAbierto] = useState(false);
  const [docEditando, setDocEditando] = useState<TipoDocumentoSoporteEstado | null>(null);
  const [docGuardando, setDocGuardando] = useState(false);
  const [docEsNuevo, setDocEsNuevo] = useState(false);
  const [docAEliminar, setDocAEliminar] = useState<TipoDocumentoSoporte | null>(null);
  const [busquedaDoc, setBusquedaDoc] = useState('');

  // Estados para gestión avanzada de opciones de campos SELECT (JSON / Importación)
  const [modoOpcionesSelect, setModoOpcionesSelect] = useState<'visual' | 'json' | 'importar'>('visual');
  const [jsonEditorTexto, setJsonEditorTexto] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [textoImportar, setTextoImportar] = useState<string>('');
  const [modoImportacion, setModoImportacion] = useState<'reemplazar' | 'agregar'>('reemplazar');
  const [mensajeCopiado, setMensajeCopiado] = useState<boolean>(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [camposRes, configsRes, docsRes] = await Promise.all([
        viaticosService.obtenerCamposFormulario(),
        viaticosService.obtenerTodasConfiguraciones(),
        viaticosService.obtenerTiposDocumentoSoporte(true),
      ]);
      setCampos(Array.isArray(camposRes) ? camposRes : []);
      setConfiguraciones(Array.isArray(configsRes) ? configsRes : []);
      setTiposDocumento(Array.isArray(docsRes) ? docsRes : []);
    } catch (e) {
      setError('Error cargando datos de parametrización.');
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const mostrarExito = (msg: string) => {
    setExito(msg);
    setTimeout(() => setExito(null), 3000);
  };

  const normalizarOpciones = (opciones: any): Array<{ value: string; label: string }> => {
    if (!Array.isArray(opciones)) return [];
    return opciones
      .map((o) => {
        if (typeof o === 'string') {
          return { value: o, label: o };
        }
        if (o && typeof o === 'object' && !Array.isArray(o)) {
          const val = o.value ?? o.valor ?? o.id ?? '';
          const lab = o.label ?? o.nombre ?? o.etiqueta ?? val;
          if (val || lab) {
            return { value: String(val), label: String(lab) };
          }
        }
        return null;
      })
      .filter((o): o is { value: string; label: string } => Boolean(o));
  };

  const parsearTextoAOpciones = (texto: string): Array<{ value: string; label: string }> => {
    const trimmed = (texto || '').trim();
    if (!trimmed) return [];

    // 1. Intentar parseo como JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === 'string' || typeof item === 'number') {
              const s = String(item).trim();
              return { value: s, label: s };
            }
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              const val = item.value ?? item.valor ?? item.id ?? item.code ?? item.codigo ?? '';
              const lab = item.label ?? item.etiqueta ?? item.nombre ?? item.name ?? item.text ?? val;
              const valStr = String(val).trim();
              const labStr = String(lab).trim();
              if (valStr || labStr) {
                return { value: valStr || labStr, label: labStr || valStr };
              }
            }
            return null;
          })
          .filter((o): o is { value: string; label: string } => Boolean(o));
      } else if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([k, v]) => {
            const val = String(k).trim();
            const lab = String(v !== null && v !== undefined ? v : k).trim();
            return { value: val, label: lab || val };
          })
          .filter((o) => Boolean(o.value || o.label));
      }
    } catch {
      // Continuar con parseo CSV / texto línea por línea si no era JSON válido
    }

    // 2. Parseo como líneas de texto / CSV / TSV / dos puntos
    const lineas = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const resultado: Array<{ value: string; label: string }> = [];

    for (const linea of lineas) {
      let partes: string[] = [];
      if (linea.includes(';') && !linea.includes(',')) {
        partes = linea.split(';');
      } else if (linea.includes(',')) {
        partes = linea.split(',');
      } else if (linea.includes(':')) {
        partes = linea.split(':');
      } else if (linea.includes('\t')) {
        partes = linea.split('\t');
      } else if (linea.includes('=')) {
        partes = linea.split('=');
      } else {
        partes = [linea, linea];
      }

      const value = (partes[0] || '').trim();
      const label = (partes.slice(1).join(',').trim()) || value;

      if (value || label) {
        resultado.push({ value: value || label, label: label || value });
      }
    }

    return resultado;
  };

  const copiarJsonAlPortapapeles = () => {
    if (!campoEditando) return;
    const str = JSON.stringify(campoEditando.opciones, null, 2);
    navigator.clipboard.writeText(str);
    setMensajeCopiado(true);
    setTimeout(() => setMensajeCopiado(false), 2000);
  };

  const handleArchivoOpciones = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setTextoImportar(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const abrirModalCampo = (campo?: CampoFormulario) => {
    setModoOpcionesSelect('visual');
    setJsonError(null);
    setTextoImportar('');
    setModoImportacion('reemplazar');
    if (campo) {
      const opts = normalizarOpciones(campo.opciones);
      setCampoEditando({
        ...campo,
        placeholder: campo.placeholder || '',
        grupo: campo.grupo || null,
        opciones: opts,
      });
      setJsonEditorTexto(JSON.stringify(opts, null, 2));
    } else {
      setCampoEditando(campoVacio());
      setJsonEditorTexto('[]');
    }
    setModalCampoAbierto(true);
  };

  const cerrarModalCampo = () => {
    setModalCampoAbierto(false);
    setCampoEditando(null);
  };

  const guardarCampo = async () => {
    if (!campoEditando) return;
    if (!campoEditando.clave.trim() || !campoEditando.etiqueta.trim()) {
      setError('Clave y etiqueta son obligatorias.');
      return;
    }

    setCampoGuardando(true);
    setError(null);

    try {
      const esSelect = campoEditando.tipoCampo?.toUpperCase() === 'SELECT';
      let opcionesBase = campoEditando.opciones;
      if (esSelect && modoOpcionesSelect === 'json' && jsonEditorTexto.trim()) {
        try {
          const parsed = parsearTextoAOpciones(jsonEditorTexto);
          if (parsed.length > 0) {
            opcionesBase = parsed;
          }
        } catch {
          // Si había error de sintaxis se usan las opciones del estado
        }
      }

      const opciones = esSelect
        ? opcionesBase
            .map((o) => ({ value: (o.value || '').trim(), label: (o.label || '').trim() }))
            .filter((o) => o.value && o.label)
        : undefined;

      if (campoEditando.id) {
        const dto: ActualizarCampoFormularioDTO = {
          etiqueta: campoEditando.etiqueta,
          tipoCampo: campoEditando.tipoCampo,
          placeholder: campoEditando.placeholder || undefined,
          grupo: campoEditando.grupo || undefined,
          orden: campoEditando.orden,
          activo: campoEditando.activo,
          opciones,
        };
        await viaticosService.actualizarCampoFormulario(campoEditando.clave, dto);
        mostrarExito(`Campo "${campoEditando.clave}" actualizado correctamente.`);
      } else {
        const dto: CrearCampoFormularioDTO = {
          clave: campoEditando.clave,
          etiqueta: campoEditando.etiqueta,
          tipoCampo: campoEditando.tipoCampo,
          placeholder: campoEditando.placeholder || undefined,
          grupo: campoEditando.grupo || undefined,
          orden: campoEditando.orden,
          activo: campoEditando.activo,
          opciones,
        };
        await viaticosService.crearCampoFormulario(dto);
        mostrarExito(`Campo "${campoEditando.clave}" creado correctamente.`);
      }
      cerrarModalCampo();
      await cargarDatos();
    } catch (e) {
      setError('Error guardando el campo. Verifica los datos.');
      console.error(e);
    } finally {
      setCampoGuardando(false);
    }
  };

  const alternarEstadoCampo = async (campo: CampoFormulario) => {
    setError(null);
    try {
      const nuevoEstado = !campo.activo;
      await viaticosService.actualizarCampoFormulario(campo.clave, { activo: nuevoEstado });
      setCampos((prev) =>
        prev.map((c) => (c.clave === campo.clave ? { ...c, activo: nuevoEstado } : c)),
      );
      mostrarExito(`Campo "${campo.clave}" ${nuevoEstado ? 'activado' : 'desactivado'}.`);
    } catch (e) {
      setError('Error cambiando el estado del campo.');
      console.error(e);
    }
  };

  const moverOrdenCampo = async (campo: CampoFormulario, delta: number) => {
    const nuevoOrden = Math.max(0, (campo.orden ?? 0) + delta);
    if (nuevoOrden === campo.orden) return;
    setError(null);
    try {
      await viaticosService.actualizarCampoFormulario(campo.clave, { orden: nuevoOrden });
      setCampos((prev) =>
        prev.map((c) => (c.clave === campo.clave ? { ...c, orden: nuevoOrden } : c)),
      );
      mostrarExito(`Orden del campo "${campo.clave}" actualizado.`);
    } catch (e) {
      setError('Error actualizando el orden del campo.');
      console.error(e);
    }
  };

  const confirmarEliminarCampo = async () => {
    if (!campoAEliminar) return;
    setError(null);
    try {
       await viaticosService.eliminarCampoFormulario(campoAEliminar.clave);
      mostrarExito(`Campo "${campoAEliminar.clave}" eliminado.`);
      setCampoAEliminar(null);
      await cargarDatos();
    } catch (e) {
      setError('Error eliminando el campo.');
      console.error(e);
    }
  };

  const agregarOpcion = () => {
    if (!campoEditando) return;
    setCampoEditando({
      ...campoEditando,
      opciones: [...campoEditando.opciones, { value: '', label: '' }],
    });
  };

  const actualizarOpcion = (idx: number, field: 'value' | 'label', value: string) => {
    if (!campoEditando) return;
    const nuevas = [...campoEditando.opciones];
    nuevas[idx] = { ...nuevas[idx], [field]: value };
    setCampoEditando({ ...campoEditando, opciones: nuevas });
  };

  const eliminarOpcion = (idx: number) => {
    if (!campoEditando) return;
    setCampoEditando({
      ...campoEditando,
      opciones: campoEditando.opciones.filter((_, i) => i !== idx),
    });
  };

  // Handlers para Documentos Soporte
  const abrirModalDoc = (doc?: TipoDocumentoSoporte) => {
    if (doc) {
      setDocEditando({
        id: doc.id,
        codigo: doc.codigo,
        nombre: doc.nombre,
        descripcion: doc.descripcion || '',
        instruccionesValidacion: doc.instruccionesValidacion || '',
        activo: doc.activo,
      });
      setDocEsNuevo(false);
    } else {
      setDocEditando(docVacio());
      setDocEsNuevo(true);
    }
    setModalDocAbierto(true);
  };

  const cerrarModalDoc = () => {
    setModalDocAbierto(false);
    setDocEditando(null);
  };

  const alternarEstadoDoc = async (doc: TipoDocumentoSoporte) => {
    try {
      await viaticosService.actualizarTipoDocumentoSoporte(doc.codigo, {
        activo: !doc.activo,
      });
      mostrarExito(`Documento "${doc.nombre}" marcado como ${!doc.activo ? 'Activo' : 'Inactivo'}.`);
      await cargarDatos();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al cambiar estado del documento soporte.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const guardarDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docEditando) return;

    if (!docEditando.codigo.trim()) {
      setError('El código o clave del documento es obligatorio.');
      return;
    }
    if (!docEditando.nombre.trim()) {
      setError('El nombre o etiqueta del documento es obligatorio.');
      return;
    }

    setDocGuardando(true);
    setError(null);

    try {
      if (docEsNuevo) {
        const dto: CrearTipoDocumentoSoporteDTO = {
          codigo: docEditando.codigo.trim().toUpperCase(),
          nombre: docEditando.nombre.trim(),
          descripcion: docEditando.descripcion.trim() || undefined,
          instruccionesValidacion: docEditando.instruccionesValidacion.trim() || undefined,
          activo: docEditando.activo,
        };
        await viaticosService.crearTipoDocumentoSoporte(dto);
        mostrarExito(`Documento soporte "${dto.nombre}" registrado exitosamente en la base de datos.`);
      } else {
        const dto: ActualizarTipoDocumentoSoporteDTO = {
          nombre: docEditando.nombre.trim(),
          descripcion: docEditando.descripcion.trim() || undefined,
          instruccionesValidacion: docEditando.instruccionesValidacion.trim() || undefined,
          activo: docEditando.activo,
        };
        await viaticosService.actualizarTipoDocumentoSoporte(docEditando.codigo, dto);
        mostrarExito(`Documento soporte "${docEditando.nombre}" actualizado exitosamente.`);
      }
      cerrarModalDoc();
      await cargarDatos();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error guardando el documento soporte.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setDocGuardando(false);
    }
  };

  const confirmarEliminarDoc = async () => {
    if (!docAEliminar) return;
    try {
      await viaticosService.eliminarTipoDocumentoSoporte(docAEliminar.codigo);
      mostrarExito(`Documento "${docAEliminar.nombre}" desactivado correctamente.`);
      setDocAEliminar(null);
      await cargarDatos();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al desactivar el documento soporte.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const insertarInstruccionSugerida = (sugerencia: string) => {
    if (!docEditando) return;
    const actual = docEditando.instruccionesValidacion.trim();
    const nueva = actual ? `${actual}\n• ${sugerencia}` : `• ${sugerencia}`;
    setDocEditando({
      ...docEditando,
      instruccionesValidacion: nueva,
    });
  };

  const abrirModalConfig = (config?: ConfigTipoComisionado) => {
    if (config) {
      setConfigEditando({
        tipoComisionado: config.tipoComisionado,
        codigoFormulario: config.codigoFormulario,
        camposObligatorios: [...config.camposObligatorios],
        camposOpcionales: [...config.camposOpcionales],
        camposOcultos: [...config.camposOcultos],
        documentosObligatorios: config.documentos
          .filter(d => d.tipoRequisito === 'OBLIGATORIO')
          .map(d => d.tipoDocumentoSoporte?.codigo ?? d.tipoDocumentoSoporteId),
        documentosOpcionales: config.documentos
          .filter(d => d.tipoRequisito === 'OPCIONAL')
          .map(d => d.tipoDocumentoSoporte?.codigo ?? d.tipoDocumentoSoporteId),
        activo: config.activo,
      });
      setConfigEsNueva(false);
    } else {
      setConfigEditando(configVacia());
      setConfigEsNueva(true);
    }
    setModalConfigAbierto(true);
  };

  const cerrarModalConfig = () => {
    setModalConfigAbierto(false);
    setConfigEditando(null);
  };

  const toggleCampoEnLista = (campo: string, lista: 'obligatorios' | 'opcionales' | 'ocultos') => {
    if (!configEditando) return;
    const siguientes: ConfigFormularioEstado = {
      ...configEditando,
      camposObligatorios: configEditando.camposObligatorios.filter(c => c !== campo),
      camposOpcionales: configEditando.camposOpcionales.filter(c => c !== campo),
      camposOcultos: configEditando.camposOcultos.filter(c => c !== campo),
    };
    if (lista === 'obligatorios') siguientes.camposObligatorios = [...siguientes.camposObligatorios, campo];
    else if (lista === 'opcionales') siguientes.camposOpcionales = [...siguientes.camposOpcionales, campo];
    else siguientes.camposOcultos = [...siguientes.camposOcultos, campo];
    setConfigEditando(siguientes);
  };

  const toggleDocEnLista = (docId: string, lista: 'obligatorios' | 'opcionales') => {
    if (!configEditando) return;
    const siguientes: ConfigFormularioEstado = {
      ...configEditando,
      documentosObligatorios: configEditando.documentosObligatorios.filter(d => d !== docId),
      documentosOpcionales: configEditando.documentosOpcionales.filter(d => d !== docId),
    };
    if (lista === 'obligatorios') siguientes.documentosObligatorios = [...siguientes.documentosObligatorios, docId];
    else siguientes.documentosOpcionales = [...siguientes.documentosOpcionales, docId];
    setConfigEditando(siguientes);
  };

  const guardarConfig = async () => {
    if (!configEditando) return;
    if (!configEditando.tipoComisionado.trim() || !configEditando.codigoFormulario.trim()) {
      setError('Tipo comisionado y código de formulario son obligatorios.');
      return;
    }

    setConfigGuardando(true);
    setError(null);

    try {
      if (configEsNueva) {
        const dto: CrearConfigTipoComisionadoDTO = {
          tipoComisionado: configEditando.tipoComisionado,
          codigoFormulario: configEditando.codigoFormulario,
          camposObligatorios: configEditando.camposObligatorios,
          camposOpcionales: configEditando.camposOpcionales,
          camposOcultos: configEditando.camposOcultos,
          documentosObligatorios: configEditando.documentosObligatorios,
          documentosOpcionales: configEditando.documentosOpcionales,
          activo: configEditando.activo,
        };
         await viaticosService.crearConfigTipoComisionado(dto);
        mostrarExito(`Configuración "${configEditando.tipoComisionado}" creada correctamente.`);
      } else {
        const dto: ActualizarConfigTipoComisionadoDTO = {
          codigoFormulario: configEditando.codigoFormulario,
          camposObligatorios: configEditando.camposObligatorios,
          camposOpcionales: configEditando.camposOpcionales,
          camposOcultos: configEditando.camposOcultos,
          documentosObligatorios: configEditando.documentosObligatorios,
          documentosOpcionales: configEditando.documentosOpcionales,
          activo: configEditando.activo,
        };
         await viaticosService.actualizarConfigTipoComisionado(configEditando.tipoComisionado, dto);
        mostrarExito(`Configuración "${configEditando.tipoComisionado}" actualizada correctamente.`);
      }
      cerrarModalConfig();
      await cargarDatos();
    } catch (e) {
      setError('Error guardando la configuración. Verifica los datos.');
      console.error(e);
    } finally {
      setConfigGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}
      {exito && (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {exito}
          </span>
          <button type="button" onClick={() => setExito(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-thin">
          <button
            type="button"
            onClick={() => setTabActiva('campos')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'campos'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Campos del Formulario
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{campos.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('documentos')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'documentos'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos Soporte
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{tiposDocumento.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('configuraciones')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'configuraciones'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuraciones por Tipo
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{configuraciones.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('escalas')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'escalas'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Escalas Viáticos
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('tarifas')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'tarifas'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Tarifas Investigador
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('terminalesAereos')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'terminalesAereos'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plane className="w-4 h-4" />
            Transporte Terminales Aéreas
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('parametros')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'parametros'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Parámetros Globales
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('tiquetes')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'tiquetes'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plane className="w-4 h-4" />
            Tiquetes y Presupuesto
          </button>
        </div>

        <div className="p-5">
          {cargando ? (
            <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> Cargando...
            </div>
          ) : (
            <>
              {/* SEPARACIÓN VISUAL Y AMIGABLE ENTRE CAMPOS FORMULARIO Y DOCUMENTOS SOPORTE */}
              {(tabActiva === 'campos' || tabActiva === 'documentos') && (
                <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/60 border border-blue-100 rounded-2xl p-4 mb-6 shadow-2xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#003DA5] text-[10px] font-black uppercase tracking-wider">
                          Parametrización del Formulario y Soportes
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-700 font-semibold">
                          {tabActiva === 'campos'
                            ? 'Gestión de Campos Dinámicos de Diligenciamiento'
                            : 'Gestión de Documentos y Archivos Soporte'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {tabActiva === 'campos'
                          ? 'Administra las variables que el solicitante diligencia (fechas, selecciones, números, textos).'
                          : 'Administra los soportes legales requeridos en travel_expenses.tipos_documento_soporte e incluye sus instrucciones de validación.'}
                      </p>
                    </div>

                    {/* Segmented Switch para alternar fácil y claramente */}
                    <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs self-start md:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setTabActiva('campos')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          tabActiva === 'campos'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Campos del Formulario
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            tabActiva === 'campos' ? 'bg-blue-900/60 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {campos.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTabActiva('documentos')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          tabActiva === 'documentos'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Documentos Soporte
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            tabActiva === 'documentos' ? 'bg-blue-900/60 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tiposDocumento.length}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === 'campos' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500">
                      Gestiona los campos del formulario de solicitud (actívalos, desactívalos, cambia su tipo o reordénalos).
                    </p>
                    <button
                      type="button"
                      onClick={() => abrirModalCampo()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo Campo
                    </button>
                  </div>

                  {campos.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      No hay campos definidos. Crea el primer campo para comenzar.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Clave</th>
                            <th className="px-4 py-3">Etiqueta</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Grupo</th>
                            <th className="px-4 py-3 text-center">Orden</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {campos.sort((a, b) => a.orden - b.orden).map((campo) => (
                            <tr key={campo.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3">
                                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                                  {campo.clave}
                                </code>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{campo.etiqueta}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                  {campo.tipoCampo}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{campo.grupo || '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() => moverOrdenCampo(campo, -1)}
                                    title="Subir orden"
                                    disabled={campo.orden <= 0}
                                    className="p-0.5 rounded hover:bg-white text-slate-600 disabled:opacity-30"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <span className="font-mono text-[11px] font-bold px-1.5 text-slate-700">
                                    {campo.orden}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => moverOrdenCampo(campo, 1)}
                                    title="Bajar orden"
                                    className="p-0.5 rounded hover:bg-white text-slate-600"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => alternarEstadoCampo(campo)}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Clic para cambiar estado activo / inactivo"
                                  >
                                    {campo.activo ? (
                                      <>
                                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-700">Activo</span>
                                      </>
                                    ) : (
                                      <>
                                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500">Inactivo</span>
                                      </>
                                    )}
                                  </button>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => abrirModalCampo(campo)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                                    title="Editar campo"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCampoAEliminar(campo)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 transition-colors"
                                    title="Eliminar campo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tabActiva === 'documentos' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative max-w-xs w-full">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={busquedaDoc}
                          onChange={(e) => setBusquedaDoc(e.target.value)}
                          placeholder="Buscar documento por nombre o código..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {tiposDocumento.filter(
                          (d) =>
                            !busquedaDoc ||
                            d.codigo.toLowerCase().includes(busquedaDoc.toLowerCase()) ||
                            d.nombre.toLowerCase().includes(busquedaDoc.toLowerCase())
                        ).length} / {tiposDocumento.length} documentos
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalDoc()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo Documento Soporte
                    </button>
                  </div>

                  {tiposDocumento.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No hay tipos de documento soporte registrados en la base de datos.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Código / Clave</th>
                            <th className="px-4 py-3">Nombre / Etiqueta</th>
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3">Instrucciones de Validación</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {tiposDocumento
                            .filter(
                              (d) =>
                                !busquedaDoc ||
                                d.codigo.toLowerCase().includes(busquedaDoc.toLowerCase()) ||
                                d.nombre.toLowerCase().includes(busquedaDoc.toLowerCase()) ||
                                (d.descripcion && d.descripcion.toLowerCase().includes(busquedaDoc.toLowerCase()))
                            )
                            .map((doc) => (
                              <tr key={doc.id || doc.codigo} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3">
                                  <code className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold border border-slate-200">
                                    {doc.codigo}
                                  </code>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  {doc.nombre}
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-xs">
                                  <p className="truncate text-xs" title={doc.descripcion || ''}>
                                    {doc.descripcion || <span className="text-slate-300 italic">Sin descripción</span>}
                                  </p>
                                </td>
                                <td className="px-4 py-3 max-w-sm">
                                  {doc.instruccionesValidacion ? (
                                    <div
                                      className="p-2 rounded-lg bg-blue-50/80 border border-blue-100 text-slate-700 text-[11px] flex items-start gap-2 shadow-2xs"
                                      title={doc.instruccionesValidacion}
                                    >
                                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                      <p className="line-clamp-2 leading-relaxed">
                                        {doc.instruccionesValidacion}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                                      <HelpCircle className="w-3 h-3 text-amber-500" />
                                      Sin instrucciones
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => alternarEstadoDoc(doc)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Clic para cambiar estado activo / inactivo"
                                  >
                                    {doc.activo ? (
                                      <>
                                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-700">Activo</span>
                                      </>
                                    ) : (
                                      <>
                                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500">Inactivo</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => abrirModalDoc(doc)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                                      title="Editar documento soporte"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDocAEliminar(doc)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 transition-colors"
                                      title="Desactivar documento soporte"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tabActiva === 'configuraciones' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500">
                      Define qué campos y documentos se requieren por tipo de comisionado.
                    </p>
                    <button
                      type="button"
                      onClick={() => abrirModalConfig()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nueva Configuración
                    </button>
                  </div>

                  {configuraciones.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <Settings className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      No hay configuraciones definidas.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {configuraciones.map((config) => (
                        <div key={config.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-black text-slate-800">{config.tipoComisionado}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{config.codigoFormulario}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                config.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {config.activo ? 'Activa' : 'Inactiva'}
                              </span>
                              <button
                                type="button"
                                onClick={() => abrirModalConfig(config)}
                                className="p-1.5 rounded-lg bg-white hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
                                title="Editar configuración"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
                            <div className="bg-white rounded-lg p-2 border border-slate-200 text-center">
                              <span className="text-red-600 font-bold block">{config.camposObligatorios.length}</span>
                              <span className="text-slate-500">Obligatorios</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-200 text-center">
                              <span className="text-blue-600 font-bold block">{config.camposOpcionales.length}</span>
                              <span className="text-slate-500">Opcionales</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-200 text-center">
                              <span className="text-slate-500 font-bold block">{config.camposOcultos.length}</span>
                              <span className="text-slate-500">Ocultos</span>
                            </div>
                          </div>

                          {config.documentos && config.documentos.length > 0 && (
                            <div className="text-[10px]">
                              <span className="text-slate-500 font-bold uppercase">Documentos:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {config.documentos.map((doc) => (
                                  <span
                                    key={doc.id}
                                    className={`px-1.5 py-0.5 rounded font-semibold ${
                                      doc.tipoRequisito === 'OBLIGATORIO'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    {doc.tipoDocumentoSoporte?.codigo || doc.tipoDocumentoSoporteId}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {tabActiva === 'escalas' && <EscalasViaticosAdmin />}
              {tabActiva === 'tarifas' && <TarifasInvestigadorAdmin />}
              {tabActiva === 'terminalesAereos' && <TarifasTransporteTerminalAdmin />}
              {tabActiva === 'parametros' && <ParametrosLiquidacionAdmin />}
              {tabActiva === 'tiquetes' && <TicketsAdminPanel />}
            </>
          )}
        </div>
      </div>

      {/* MODAL CAMPO */}
      {modalCampoAbierto && campoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl ${campoEditando.tipoCampo?.toUpperCase() === 'SELECT' ? 'max-w-2xl' : 'max-w-lg'} w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto transition-all`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {campoEditando.id ? 'Editar Campo' : 'Nuevo Campo'}
              </h3>
              <button type="button" onClick={cerrarModalCampo} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clave *</label>
                  <input
                    type="text"
                    value={campoEditando.clave}
                    onChange={(e) => setCampoEditando({ ...campoEditando, clave: e.target.value })}
                    disabled={!!campoEditando.id}
                    placeholder="ej: objetoComision"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Etiqueta *</label>
                  <input
                    type="text"
                    value={campoEditando.etiqueta}
                    onChange={(e) => setCampoEditando({ ...campoEditando, etiqueta: e.target.value })}
                    placeholder="ej: Objeto de la Comisión"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Campo</label>
                  <select
                    value={campoEditando.tipoCampo}
                    onChange={(e) => setCampoEditando({ ...campoEditando, tipoCampo: e.target.value as TipoCampoFormulario })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_CAMPO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grupo</label>
                  <select
                    value={campoEditando.grupo || ''}
                    onChange={(e) => setCampoEditando({ ...campoEditando, grupo: (e.target.value as GrupoCampoFormulario) || null })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin grupo</option>
                    {GRUPOS_CAMPO.map((grupo) => (
                      <option key={grupo} value={grupo}>{grupo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={campoEditando.placeholder}
                    onChange={(e) => setCampoEditando({ ...campoEditando, placeholder: e.target.value })}
                    placeholder="ej: Describa el objeto..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Orden</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={campoEditando.orden}
                    onChange={(e) => setCampoEditando({ ...campoEditando, orden: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCampoEditando({ ...campoEditando, activo: !campoEditando.activo })}
                  className="text-slate-600"
                >
                  {campoEditando.activo
                    ? <ToggleRight className="w-6 h-6 text-emerald-600" />
                    : <ToggleLeft className="w-6 h-6 text-slate-400" />
                  }
                </button>
                <span className="text-xs text-slate-600 font-semibold">
                  {campoEditando.activo ? 'Campo activo' : 'Campo inactivo'}
                </span>
              </div>

              {campoEditando.tipoCampo?.toUpperCase() === 'SELECT' && (
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                  {/* Encabezado con Tabs y Contador */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Opciones del Select
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {campoEditando.opciones.length} {campoEditando.opciones.length === 1 ? 'opción' : 'opciones'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Edita manualmente, usa el editor JSON directo o importa desde archivo/CSV
                      </p>
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setModoOpcionesSelect('visual')}
                        className={`px-3 py-1 rounded-md transition-all ${modoOpcionesSelect === 'visual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Formulario
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJsonEditorTexto(JSON.stringify(campoEditando.opciones, null, 2));
                          setJsonError(null);
                          setModoOpcionesSelect('json');
                        }}
                        className={`px-3 py-1 rounded-md transition-all ${modoOpcionesSelect === 'json' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Editor JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTextoImportar('');
                          setModoOpcionesSelect('importar');
                        }}
                        className={`px-3 py-1 rounded-md transition-all ${modoOpcionesSelect === 'importar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Importar / Pegar
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB 1: FORMULARIO VISUAL */}
                  {modoOpcionesSelect === 'visual' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lista de Opciones</span>
                        <div className="flex items-center gap-2">
                          {campoEditando.opciones.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={copiarJsonAlPortapapeles}
                                className="text-[10px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"
                                title="Copiar opciones actuales en JSON"
                              >
                                {mensajeCopiado ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{mensajeCopiado ? '¡Copiado!' : 'Copiar JSON'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCampoEditando({ ...campoEditando, opciones: [] })}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 px-1"
                              >
                                Limpiar todo
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={agregarOpcion}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                          >
                            + Añadir opción
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
                        {campoEditando.opciones.map((opcion, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 w-4 text-right">{idx + 1}.</span>
                            <input
                              type="text"
                              value={opcion.value ?? ''}
                              onChange={(e) => actualizarOpcion(idx, 'value', e.target.value)}
                              placeholder="Valor"
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <input
                              type="text"
                              value={opcion.label ?? ''}
                              onChange={(e) => actualizarOpcion(idx, 'label', e.target.value)}
                              placeholder="Etiqueta"
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => eliminarOpcion(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar opción"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {campoEditando.opciones.length === 0 && (
                          <div className="text-center py-4 bg-white/60 border border-dashed border-slate-200 rounded-lg">
                            <p className="text-xs text-slate-500 font-medium">No hay opciones registradas.</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Haz clic en "+ Añadir opción" o utiliza las pestañas "Editor JSON" o "Importar / Pegar".
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: EDITOR JSON DIRECTO */}
                  {modoOpcionesSelect === 'json' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Editor de Código JSON
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(jsonEditorTexto);
                                setJsonEditorTexto(JSON.stringify(parsed, null, 2));
                                setJsonError(null);
                              } catch (e: any) {
                                setJsonError('Error al formatear: sintaxis JSON inválida');
                              }
                            }}
                            className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200"
                          >
                            Formatear JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(jsonEditorTexto);
                              setMensajeCopiado(true);
                              setTimeout(() => setMensajeCopiado(false), 2000);
                            }}
                            className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"
                          >
                            {mensajeCopiado ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{mensajeCopiado ? '¡Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={7}
                        value={jsonEditorTexto}
                        onChange={(e) => {
                          setJsonEditorTexto(e.target.value);
                          setJsonError(null);
                        }}
                        placeholder={`[\n  { "value": "AHO", "label": "Cuenta de Ahorros" },\n  { "value": "CTE", "label": "Cuenta Corriente" }\n]`}
                        className="w-full p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                        spellCheck={false}
                      />

                      {jsonError && (
                        <p className="text-[10px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{jsonError}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] text-slate-400">
                          Acepta arrays <code>[&#123; value, label &#125;]</code>, strings <code>["A", "B"]</code> u objeto <code>&#123; "clave": "valor" &#125;</code>.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const opts = parsearTextoAOpciones(jsonEditorTexto);
                              setCampoEditando({ ...campoEditando, opciones: opts });
                              setModoOpcionesSelect('visual');
                              mostrarExito(`${opts.length} opciones aplicadas desde el JSON.`);
                            } catch (err: any) {
                              setJsonError(err.message || 'JSON inválido');
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                        >
                          Aplicar JSON a Opciones
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: IMPORTAR ARCHIVO O TEXTO */}
                  {modoOpcionesSelect === 'importar' && (
                    <div className="space-y-3">
                      {/* Subida de Archivo */}
                      <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-3 text-center bg-white/90 transition-colors">
                        <input
                          type="file"
                          id="archivoOpcionesInput"
                          accept=".json,.csv,.txt"
                          onChange={handleArchivoOpciones}
                          className="hidden"
                        />
                        <label
                          htmlFor="archivoOpcionesInput"
                          className="cursor-pointer flex flex-col items-center justify-center gap-1"
                        >
                          <Upload className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700">
                            Haz clic para cargar archivo <span className="text-blue-600 font-normal">(.json, .csv, .txt)</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Lee automáticamente el contenido del archivo en el cuadro inferior
                          </span>
                        </label>
                      </div>

                      {/* Textarea para pegar texto o revisar archivo cargado */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          O pega aquí el contenido JSON o CSV (valores por línea o separados por coma)
                        </label>
                        <textarea
                          rows={4}
                          value={textoImportar}
                          onChange={(e) => setTextoImportar(e.target.value)}
                          placeholder={`Ejemplo CSV / Texto:\nAHORROS, Cuenta de Ahorros\nCORRIENTE, Cuenta Corriente\n\nO JSON:\n[{"value":"AHORROS","label":"Cuenta de Ahorros"}]`}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          spellCheck={false}
                        />
                      </div>

                      {/* Previsualización y Modo de Importación */}
                      {(() => {
                        const opcionesDetectadas = parsearTextoAOpciones(textoImportar);
                        return (
                          <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${opcionesDetectadas.length > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {opcionesDetectadas.length > 0
                                    ? `✓ ${opcionesDetectadas.length} opciones detectadas`
                                    : 'Sin opciones detectadas'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <label className="text-[11px] text-slate-600 font-medium">Modo:</label>
                                <select
                                  value={modoImportacion}
                                  onChange={(e) => setModoImportacion(e.target.value as 'reemplazar' | 'agregar')}
                                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                                >
                                  <option value="reemplazar">Reemplazar existentes</option>
                                  <option value="agregar">Agregar a las existentes</option>
                                </select>
                              </div>
                            </div>

                            {opcionesDetectadas.length > 0 && (
                              <div className="max-h-24 overflow-y-auto bg-slate-50 rounded p-2 text-[10px] space-y-1">
                                {opcionesDetectadas.slice(0, 10).map((o, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-slate-700">
                                    <span className="font-mono font-bold text-blue-700">{o.value}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-slate-800">{o.label}</span>
                                  </div>
                                ))}
                                {opcionesDetectadas.length > 10 && (
                                  <p className="text-slate-400 italic">
                                    ... y {opcionesDetectadas.length - 10} opciones más
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                disabled={opcionesDetectadas.length === 0}
                                onClick={() => {
                                  if (modoImportacion === 'reemplazar') {
                                    setCampoEditando({ ...campoEditando, opciones: opcionesDetectadas });
                                  } else {
                                    const existentes = [...campoEditando.opciones];
                                    const existingVals = new Set(existentes.map((e) => e.value.toLowerCase()));
                                    const nuevas = opcionesDetectadas.filter((o) => !existingVals.has(o.value.toLowerCase()));
                                    setCampoEditando({ ...campoEditando, opciones: [...existentes, ...nuevas] });
                                  }
                                  setModoOpcionesSelect('visual');
                                  mostrarExito(`${opcionesDetectadas.length} opciones importadas exitosamente.`);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                              >
                                Importar {opcionesDetectadas.length > 0 ? `(${opcionesDetectadas.length})` : ''}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cerrarModalCampo}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarCampo}
                disabled={campoGuardando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] disabled:opacity-50 text-white font-bold rounded-lg text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {campoGuardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN */}
      {modalConfigAbierto && configEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {configEsNueva ? 'Nueva Configuración' : `Editar: ${configEditando.tipoComisionado}`}
              </h3>
              <button type="button" onClick={cerrarModalConfig} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo Comisionado *</label>
                  {configEsNueva ? (
                    <select
                      value={configEditando.tipoComisionado}
                      onChange={(e) => setConfigEditando({ ...configEditando, tipoComisionado: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {TIPOS_COMISIONADO.filter(
                        tipo => !configuraciones.some(c => c.tipoComisionado === tipo)
                      ).map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={configEditando.tipoComisionado}
                      disabled
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código Formulario *</label>
                  <input
                    type="text"
                    value={configEditando.codigoFormulario}
                    onChange={(e) => setConfigEditando({ ...configEditando, codigoFormulario: e.target.value })}
                    placeholder="ej: REPORTE_SOLICITUD"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfigEditando({ ...configEditando, activo: !configEditando.activo })}
                  className="text-slate-600"
                >
                  {configEditando.activo
                    ? <ToggleRight className="w-6 h-6 text-emerald-600" />
                    : <ToggleLeft className="w-6 h-6 text-slate-400" />
                  }
                </button>
                <span className="text-xs text-slate-600 font-semibold">
                  {configEditando.activo ? 'Configuración activa' : 'Configuración inactiva'}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Asignación de Campos</label>
                {campos.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No hay campos disponibles. Crea campos primero.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {campos.sort((a, b) => a.orden - b.orden).map((campo) => {
                      const esObli = configEditando.camposObligatorios.includes(campo.clave);
                      const esOpci = configEditando.camposOpcionales.includes(campo.clave);
                      const esOculto = configEditando.camposOcultos.includes(campo.clave);
                      return (
                        <div key={campo.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-slate-600">{campo.clave}</code>
                            <span className="text-[10px] text-slate-400">{campo.etiqueta}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleCampoEnLista(campo.clave, 'obligatorios')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                esObli ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500 hover:bg-red-50'
                              }`}
                              title="Obligatorio"
                            >
                              OBL
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCampoEnLista(campo.clave, 'opcionales')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                esOpci ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50'
                              }`}
                              title="Opcional"
                            >
                              OPC
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCampoEnLista(campo.clave, 'ocultos')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                esOculto ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title="Oculto"
                            >
                              OCL
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {tiposDocumento.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Documentos Requeridos</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {tiposDocumento.map((doc) => {
                      const esObli = configEditando.documentosObligatorios.includes(doc.codigo);
                      const esOpci = configEditando.documentosOpcionales.includes(doc.codigo);
                      return (
                        <div key={doc.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-slate-600">{doc.codigo}</code>
                            <span className="text-[10px] text-slate-400">{doc.nombre}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleDocEnLista(doc.codigo, 'obligatorios')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                esObli ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500 hover:bg-red-50'
                              }`}
                              title="Obligatorio"
                            >
                              OBL
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDocEnLista(doc.codigo, 'opcionales')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                esOpci ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50'
                              }`}
                              title="Opcional"
                            >
                              OPC
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cerrarModalConfig}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarConfig}
                disabled={configGuardando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] disabled:opacity-50 text-white font-bold rounded-lg text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {configGuardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {campoAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">Eliminar Campo</h3>
            </div>
            <p className="text-xs text-slate-600 mb-6">
              ¿Estás seguro de que deseas eliminar el campo <code className="font-mono font-bold text-slate-800">{campoAEliminar.clave}</code>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCampoAEliminar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarCampo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR DOCUMENTO SOPORTE */}
      {modalDocAbierto && docEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#003DA5]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {docEsNuevo ? 'Nuevo Tipo de Documento Soporte' : `Editar Documento: ${docEditando.codigo}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configuración en tabla <code className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded">travel_expenses.tipos_documento_soporte</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarModalDoc}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarDoc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código / Clave Única *
                  </label>
                  <input
                    type="text"
                    value={docEditando.codigo}
                    disabled={!docEsNuevo}
                    onChange={(e) =>
                      setDocEditando({
                        ...docEditando,
                        codigo: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                      })
                    }
                    placeholder="ej: POLIZA_CUMPLIMIENTO"
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                      docEsNuevo
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {docEsNuevo
                      ? 'Identificador en mayúsculas sin espacios (ej: CERT_BANCARIA, RUT).'
                      : 'El código es inmutable para proteger relaciones existentes.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nombre o Etiqueta Visible *
                  </label>
                  <input
                    type="text"
                    value={docEditando.nombre}
                    onChange={(e) => setDocEditando({ ...docEditando, nombre: e.target.value })}
                    placeholder="ej: Certificación Bancaria Vigente"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nombre comprensible que verá el comisionado y el validador.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Descripción General
                </label>
                <input
                  type="text"
                  value={docEditando.descripcion}
                  onChange={(e) => setDocEditando({ ...docEditando, descripcion: e.target.value })}
                  placeholder="ej: Certificación expedida por la entidad bancaria que avala la cuenta de ahorros o corriente."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Finalidad o justificación de este requisito documental.
                </p>
              </div>

              {/* CAMPO CLAVE: INSTRUCCIONES DE VALIDACIÓN CON AYUDAS AMIGABLES */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Instrucciones de Validación para este Documento
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-100/70 font-bold px-2 py-0.5 rounded-full">
                    Guía de Aprobación
                  </span>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2 text-slate-600 text-xs">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>¿Qué colocar aquí?</strong> Redacta instrucciones claras y directas para que los auditores sepan qué verificar y los solicitantes no comentan errores (ej. vigencia de 90 días, datos fiscales de la ESAP, firmas requeridas, etc.).
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    💡 Pautas sugeridas (haz clic para insertar viñeta):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Vigencia: Máximo 90 días calendario a partir de su fecha de expedición.')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + 📅 Vigencia ≤ 90 días
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Firmas: Debe contar con firmas digitales o manuscritas legibles de las partes autorizadas.')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + ✍️ Firmas legibles
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Titularidad: Debe figurar a nombre del comisionado y coincidir con su identificación.')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + 👤 A nombre del comisionado
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Facturación ESAP: Debe expedirse a nombre de Escuela Superior de Administración Pública - ESAP (NIT 899.999.054-1).')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + 🏢 NIT ESAP
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Validación DIAN: Factura electrónica con código CUFE o QR verificable ante la DIAN.')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + 🧾 CUFE DIAN
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertarInstruccionSugerida('Formato: Archivo en formato PDF legible, no protegido con contraseña.')
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      + 📄 Formato PDF legible
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={docEditando.instruccionesValidacion}
                  onChange={(e) =>
                    setDocEditando({ ...docEditando, instruccionesValidacion: e.target.value })
                  }
                  placeholder="Escribe las instrucciones detalladas de campo o utiliza los botones de sugerencia..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDocEditando({ ...docEditando, activo: !docEditando.activo })}
                  className="text-slate-600 cursor-pointer"
                >
                  {docEditando.activo ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </button>
                <span className="text-xs text-slate-700 font-semibold">
                  {docEditando.activo
                    ? 'Documento soporte activo y habilitado en el sistema'
                    : 'Documento soporte inactivo (no disponible para nuevas solicitudes)'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModalDoc}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={docGuardando}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {docGuardando ? 'Guardando...' : 'Guardar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR DESACTIVAR DOCUMENTO SOPORTE */}
      {docAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">Desactivar Documento Soporte</h3>
            </div>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              ¿Estás seguro de que deseas desactivar el documento <strong className="text-slate-800 font-bold">{docAEliminar.nombre}</strong> (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{docAEliminar.codigo}</code>)?
              <br />
              <span className="text-[11px] text-slate-500 mt-2 block">
                El documento pasará a estado inactivo para preservar la integridad de las comisiones y solicitudes históricas.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocAEliminar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarDoc}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}