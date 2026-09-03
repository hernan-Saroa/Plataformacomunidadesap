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
  TipoCampoFormulario,
  GrupoCampoFormulario,
} from '../types/parametrizacion';
import EscalasViaticosAdmin from './admin/EscalasViaticosAdmin';
import TarifasInvestigadorAdmin from './admin/TarifasInvestigadorAdmin';
import ExcepcionesRegionalesAdmin from './admin/ExcepcionesRegionalesAdmin';
import ParametrosLiquidacionAdmin from './admin/ParametrosLiquidacionAdmin';
import TicketsAdminPanel from './admin/TicketsAdminPanel';

type TabActiva = 'campos' | 'configuraciones' | 'escalas' | 'tarifas' | 'excepciones' | 'parametros' | 'tiquetes';

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

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [camposRes, configsRes, docsRes] = await Promise.all([
        viaticosService.obtenerCamposFormulario(),
        viaticosService.obtenerTodasConfiguraciones(),
        viaticosService.obtenerTiposDocumentoSoporte(),
      ]);
      setCampos(camposRes);
      setConfiguraciones(configsRes);
      setTiposDocumento(docsRes);
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

  const abrirModalCampo = (campo?: CampoFormulario) => {
    if (campo) {
      setCampoEditando({
        ...campo,
        placeholder: campo.placeholder || '',
        grupo: campo.grupo || null,
        opciones: campo.opciones || [],
      });
    } else {
      setCampoEditando(campoVacio());
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
      const opciones = campoEditando.tipoCampo === 'SELECT'
        ? campoEditando.opciones.filter(o => o.value && o.label)
        : undefined;

      if (campoEditando.id) {
        const dto: ActualizarCampoFormularioDTO = {
          etiqueta: campoEditando.etiqueta,
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
            onClick={() => setTabActiva('excepciones')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tabActiva === 'excepciones'
                ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Excepciones Regionales
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
              {tabActiva === 'campos' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500">
                      Gestiona los campos dinámicos del formulario de solicitud.
                    </p>
                    {/* <button
                      type="button"
                      onClick={() => abrirModalCampo()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo Campo
                    </button> */}
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
                            <th className="px-4 py-3">Orden</th>
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
                              <td className="px-4 py-3 text-slate-600">{campo.orden}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  campo.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {campo.activo ? 'Activo' : 'Inactivo'}
                                </span>
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
              {tabActiva === 'excepciones' && <ExcepcionesRegionalesAdmin />}
              {tabActiva === 'parametros' && <ParametrosLiquidacionAdmin />}
              {tabActiva === 'tiquetes' && <TicketsAdminPanel />}
            </>
          )}
        </div>
      </div>

      {/* MODAL CAMPO */}
      {modalCampoAbierto && campoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
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

              {campoEditando.tipoCampo === 'SELECT' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Opciones del Select</label>
                    <button
                      type="button"
                      onClick={agregarOpcion}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                    >
                      + Añadir opción
                    </button>
                  </div>
                  <div className="space-y-2">
                    {campoEditando.opciones.map((opcion, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opcion.value}
                          onChange={(e) => actualizarOpcion(idx, 'value', e.target.value)}
                          placeholder="Valor"
                          className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={opcion.label}
                          onChange={(e) => actualizarOpcion(idx, 'label', e.target.value)}
                          placeholder="Etiqueta"
                          className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarOpcion(idx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {campoEditando.opciones.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No hay opciones. Añade al menos una.</p>
                    )}
                  </div>
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
    </div>
  );
}