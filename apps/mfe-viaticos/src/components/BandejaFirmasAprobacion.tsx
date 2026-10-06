import React, { useEffect, useState, useMemo } from 'react';
import {
  FileSignature,
  Search,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileDown,
  Eye,
  Info,
  Award,
  RotateCcw,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import authService from '../services/api/authService';
import { SolicitudViatico } from '../types/viaticos';
import { formatearMoneda, formatearNombreComisionado } from '../utils/viaticosUtils';
import ModalFirmasAprobacion from './ModalFirmasAprobacion';
import VisorDocumentosFlotante, { useVisorDocumentos } from './VisorDocumentosFlotante';

interface Props {
  onVerDetalle?: (solicitud: SolicitudViatico) => void;
  filtroReglaEspecial?: boolean;
}

export const BandejaFirmasAprobacion: React.FC<Props> = ({
  onVerDetalle,
  filtroReglaEspecial = false,
}) => {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroRegla, setFiltroRegla] = useState<string>(filtroReglaEspecial ? 'REGLA_ESPECIAL' : 'TODAS');
  const [solicitudParaFirmar, setSolicitudParaFirmar] = useState<any | null>(null);
  const [modalFirmasAbierta, setModalFirmasAbierta] = useState<boolean>(false);
  const [descargandoPdfId, setDescargandoPdfId] = useState<string | null>(null);

  const {
    documentosVisor,
    abrirDocumentoVisor,
    cerrarDocumentoVisor,
  } = useVisorDocumentos();

  const usuario = authService.getCurrentUserSync();
  const esSuperAdmin = Boolean(usuario?.esAdmin || authService.isSuperAdmin());

  // Validación directa: Si tiene rol/permiso general es_jefe, es_gerente, es_subdirector o es_director
  const esJefe =
    authService.hasPermission('travel_expenses.general.es_jefe_dependencia') ||
    authService.hasPermission('travel_expenses.general.es_jefe') ||
    authService.hasPermission('general.es_jefe') ||
    authService.isJefeDependencia();

  const esGerente =
    authService.hasPermission('travel_expenses.general.es_gerente_proyecto') ||
    authService.hasPermission('travel_expenses.general.es_gerente') ||
    authService.hasPermission('general.es_gerente') ||
    authService.isGerenteProyecto();

  const esSubdir =
    authService.hasPermission('travel_expenses.general.es_subdireccion_corporativa') ||
    authService.hasPermission('travel_expenses.general.es_subdirector') ||
    authService.hasPermission('general.es_subdirector') ||
    authService.isSubdireccionGestionCorporativa();

  const esDirNac =
    authService.hasPermission('travel_expenses.general.es_direccion_nacional') ||
    authService.hasPermission('travel_expenses.general.es_director') ||
    authService.hasPermission('general.es_director') ||
    authService.isDireccionNacional();

  // Si tiene alguno de estos roles/permisos directivos, muestra la bandeja; de lo contrario no.
  const puedeVerBandeja = esSuperAdmin || esJefe || esGerente || esSubdir || esDirNac;
  const puedeFirmar = puedeVerBandeja;

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await viaticosService.obtenerBandejaFirmas(1, 100, busqueda);
      setSolicitudes(res.data || []);
    } catch (err: any) {
      console.error('Error cargando bandeja de firmas de aprobación:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No fue posible cargar las solicitudes pendientes de firma de aprobación.',
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!puedeVerBandeja) {
      setCargando(false);
      return;
    }
    cargarSolicitudes();
  }, [busqueda, puedeVerBandeja]);

  // Determina si una solicitud está pendiente de la firma del usuario actual
  const faltaMiFirma = (s: any): boolean => {
    const firmas = Array.isArray(s.camposAdicionales?.firmasAprobacion)
      ? s.camposAdicionales.firmasAprobacion
      : [];
    if (esSuperAdmin) {
      const tieneJefe = firmas.some((f: any) => f.tipo === 'JEFE_DEPENDENCIA' && f.estado !== 'RECHAZADO');
      const tieneGerente = firmas.some((f: any) => f.tipo === 'GERENTE_PROYECTO' && f.estado !== 'RECHAZADO');
      return !tieneJefe || !tieneGerente;
    }
    if (esGerente && !esJefe && !esSubdir && !esDirNac) {
      return !firmas.some((f: any) => f.tipo === 'GERENTE_PROYECTO' && f.estado !== 'RECHAZADO');
    }
    if (esJefe || esSubdir || esDirNac) {
      return !firmas.some((f: any) => f.tipo === 'JEFE_DEPENDENCIA' && f.estado !== 'RECHAZADO');
    }
    return false;
  };

  // Determina si el usuario actual ya registró su firma en la solicitud
  const yaFirme = (s: any): boolean => {
    const firmas = Array.isArray(s.camposAdicionales?.firmasAprobacion)
      ? s.camposAdicionales.firmasAprobacion
      : [];
    if (esGerente && firmas.some((f: any) => f.tipo === 'GERENTE_PROYECTO' && f.estado !== 'RECHAZADO')) {
      return true;
    }
    if ((esJefe || esSubdir || esDirNac) && firmas.some((f: any) => f.tipo === 'JEFE_DEPENDENCIA' && f.estado !== 'RECHAZADO')) {
      return true;
    }
    return false;
  };

  // Determina si la solicitud tiene 1 firma registrada y está esperando la restante
  const estaEnEsperaOtraFirma = (s: any): boolean => {
    const firmas = Array.isArray(s.camposAdicionales?.firmasAprobacion)
      ? s.camposAdicionales.firmasAprobacion
      : [];
    const validas = firmas.filter((f: any) => f.estado !== 'RECHAZADO');
    return validas.length === 1;
  };

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      const regla = s.camposAdicionales?.reglaDesplazamiento || 'REGULAR';
      if (filtroRegla === 'REGLA_ESPECIAL') {
        return regla !== 'REGULAR';
      }
      if (filtroRegla === 'REGULAR') {
        return regla === 'REGULAR';
      }
      if (filtroRegla === 'POR_FIRMAR') {
        return faltaMiFirma(s);
      }
      if (filtroRegla === 'EN_ESPERA') {
        return estaEnEsperaOtraFirma(s);
      }
      if (filtroRegla === 'MIS_PENDIENTES') {
        // En Mis Pendientes se muestran tanto las que le faltan su firma
        // como las que el usuario ya firmó pero siguen esperando la otra firma
        // hasta que formalicen y pasen a estado SOLICITADO
        return faltaMiFirma(s) || (yaFirme(s) && estaEnEsperaOtraFirma(s));
      }
      return true;
    });
  }, [solicitudes, filtroRegla, esGerente, esJefe, esSubdir, esDirNac, esSuperAdmin]);

  const pendientesTotales = solicitudes.length;
  const conReglaEspecial = solicitudes.filter(
    (s) => s.camposAdicionales?.reglaDesplazamiento && s.camposAdicionales.reglaDesplazamiento !== 'REGULAR',
  ).length;
  const conUnaFirma = solicitudes.filter(
    (s) =>
      Array.isArray(s.camposAdicionales?.firmasAprobacion) &&
      s.camposAdicionales.firmasAprobacion.filter((f: any) => f.estado !== 'RECHAZADO').length === 1,
  ).length;
  const enEsperaCount = conUnaFirma;
  const porFirmarCount = useMemo(
    () => solicitudes.filter(faltaMiFirma).length,
    [solicitudes, esSuperAdmin, esGerente, esJefe, esSubdir, esDirNac],
  );
  const montoAcumulado = solicitudes.reduce(
    (acc, curr) =>
      acc +
      (Number(curr.montoViaticos || 0) || 0) +
      (Number(curr.montoGastosViaje || 0) || 0),
    0,
  );

  const abrirFirmaModal = (sol: any) => {
    setSolicitudParaFirmar(sol);
    setModalFirmasAbierta(true);
  };

  const handleDescargarPdf = async (sol: any) => {
    try {
      setDescargandoPdfId(sol.id);
      const blob = await viaticosService.exportarFormato023(sol.id, sol.codigoSolicitud || sol.codigo);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_023_${sol.codigoSolicitud || sol.codigo || 'comision'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error descargando Formato 023:', err);
      alert('No fue posible descargar el Formato 023. Verifique que la solicitud cuente con datos consolidados.');
    } finally {
      setDescargandoPdfId(null);
    }
  };

  const handlePrevisualizar023 = async (sol: any) => {
    try {
      setDescargandoPdfId(sol.id);
      const blob = await viaticosService.exportarFormato023(sol.id, sol.codigoSolicitud || sol.codigo);
      const url = window.URL.createObjectURL(blob);
      abrirDocumentoVisor({
        url,
        nombre: `Formato 023 — ${sol.codigoSolicitud || sol.codigo || 'comision'}.pdf`,
        tipo: 'Formato 023 Oficial',
        mime: 'application/pdf',
      });
    } catch (err: any) {
      console.error('Error previsualizando Formato 023:', err);
      alert('No fue posible abrir el Formato 023 en el visor flotante.');
    } finally {
      setDescargandoPdfId(null);
    }
  };

  const obtenerBadgeRegla = (sol: any) => {
    const regla = sol.camposAdicionales?.reglaDesplazamiento;
    const desc = sol.camposAdicionales?.descripcionReglaDesplazamiento;

    if (regla === 'SUBDIRECTOR_NACIONAL') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: '#FDF4FF', color: '#9333EA', border: '1px solid #F0ABFC' }}
          title={desc}
        >
          <Award className="w-3.5 h-3.5" />
          Regla: Firma Director Nac. (Subdirector se desplaza)
        </span>
      );
    }
    if (regla === 'DIRECTOR_NACIONAL') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
          title={desc}
        >
          <Award className="w-3.5 h-3.5" />
          Regla: Firma Subdirector Nac. (Director Nac. se desplaza)
        </span>
      );
    }
    if (regla === 'DIRECTOR_TERRITORIAL') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
          title={desc}
        >
          <Award className="w-3.5 h-3.5" />
          Regla: Firma Director Nac. (Director Territorial se desplaza)
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}
        title="Jefe de Dependencia / Supervisor y Gerente de Proyecto"
      >
        <Building2 className="w-3.5 h-3.5" />
        Regla Regular: Jefe de Dependencia + Gerente
      </span>
    );
  };

  if (!puedeVerBandeja) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Acceso Exclusivo para Directivos Firmantes</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Esta bandeja de firmas de aprobación previa a radicación (Formato 023) está reservada exclusivamente para el Jefe de Dependencia, Gerente de Proyecto, Subdirección de Gestión Corporativa y Dirección Nacional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Institucional con Estilo Garantizado */}
      <div
        className="rounded-2xl p-6 shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #002266 0%, #003DA5 55%, #155DFC 100%)',
          borderLeft: '6px solid #6591f2ff',
          color: '#FFFFFF',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
                style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
              >
                <FileSignature className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Bandeja de Firmas de Aprobación — Formato 023
                  </h1>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f4d779ff' }}
                  >
                    Previo a Radicación
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Suscripción digital y visto bueno de comisiones previo a radicación formal en ventanilla institucional (ESAP).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2"
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
            >
              <User className="w-3.5 h-3.5 text-slate-300" />
              <span>
                Rol:{' '}
                <strong className="text-white">
                  {esSuperAdmin
                    ? 'Super Administrador'
                    : esDirNac
                    ? 'Dirección Nacional'
                    : esSubdir
                    ? 'Subdirección de Gestión Corporativa'
                    : esJefe
                    ? 'Jefe de Dependencia / Supervisor'
                    : esGerente
                    ? 'Gerente de Proyecto'
                    : 'Firmante Autorizado'}
                </strong>
              </span>
            </div>

            <button
              onClick={cargarSolicitudes}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/10 active:scale-95"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Criterio Institucional */}
        <div
          className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-xs text-slate-300"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sin las firmas completas la solicitud <strong>no se radica</strong> en el sistema.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Surtido el flujo de firmas, la solicitud pasa automáticamente a la <strong>Secretaría de Viáticos</strong> (estado SOLICITADO / EXTEMPORÁNEA).</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendientes de Firma</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{pendientesTotales}</p>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Estado PENDIENTE_FIRMAS
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <FileSignature className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reglas Desplazamiento</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{conReglaEspecial}</p>
            <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
              <Award className="w-3 h-3" /> Subdirectores y Directores
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">1 Firma Registrada</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{conUnaFirma}</p>
            <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> En espera de firma restante
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monto Estimado</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatearMoneda(montoAcumulado)}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Valor total en bandeja
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="search_filtro_firmas_query"
            id="search_filtro_firmas_query"
            autoComplete="new-password"
            data-lpignore="true"
            data-form-type="other"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, cédula, comisionado, destino..."
            className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Filtrar:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 flex-wrap">
            <button
              onClick={() => setFiltroRegla('TODAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'TODAS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({solicitudes.length})
            </button>
            <button
              onClick={() => setFiltroRegla('MIS_PENDIENTES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'MIS_PENDIENTES'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Solicitudes que requieren su firma o que ya firmó y están en espera de la otra firma"
            >
              Mis Solicitudes
            </button>
            <button
              onClick={() => setFiltroRegla('POR_FIRMAR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'POR_FIRMAR'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes de Mi Firma ({porFirmarCount})
            </button>
            <button
              onClick={() => setFiltroRegla('EN_ESPERA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'EN_ESPERA'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Solicitudes con 1 de 2 firmas que esperan la firma restante para pasar a SOLICITADO"
            >
              En Espera de Otra Firma ({enEsperaCount})
            </button>
            <button
              onClick={() => setFiltroRegla('REGLA_ESPECIAL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'REGLA_ESPECIAL'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reglas Desplazamiento ({conReglaEspecial})
            </button>
            <button
              onClick={() => setFiltroRegla('REGULAR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filtroRegla === 'REGULAR'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regla Regular
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Solicitudes */}
      {cargando ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Cargando solicitudes para firma de aprobación...</p>
          <p className="text-xs text-slate-400 mt-1">Consultando expedientes en estado PENDIENTE_FIRMAS</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={cargarSolicitudes}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            {filtroRegla === 'POR_FIRMAR'
              ? 'No tiene firmas pendientes por realizar'
              : filtroRegla === 'EN_ESPERA'
              ? 'No hay solicitudes en espera de otra firma'
              : 'No hay comisiones en este criterio de búsqueda'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            {filtroRegla === 'POR_FIRMAR'
              ? 'Todas las comisiones asignadas a su rol cuentan con su firma estampada. Puede consultar las solicitudes en espera de la otra firma en la pestaña correspondiente o ver la lista general en "Todas".'
              : 'Las solicitudes suscritas avanzan automáticamente a estado SOLICITADO una vez completadas las dos firmas de aprobación.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudesFiltradas.map((sol) => {
            const comisionado = sol.comisionado || {};
            const firmas = Array.isArray(sol.camposAdicionales?.firmasAprobacion)
              ? sol.camposAdicionales.firmasAprobacion
              : [];
            const firmaJefe = firmas.find((f: any) => f.tipo === 'JEFE_DEPENDENCIA' && f.estado !== 'RECHAZADO');
            const firmaGerente = firmas.find((f: any) => f.tipo === 'GERENTE_PROYECTO' && f.estado !== 'RECHAZADO');
            const firmaElaboro = sol.camposAdicionales?.firmaElaboro || null;
            const tieneFirma1 = Boolean(firmaJefe);
            const tieneFirma2 = Boolean(firmaGerente);

            return (
              <div
                key={sol.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Encabezado e Información de la Solicitud */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        {sol.consecutivoUnico || sol.codigoSolicitud || sol.codigo || 'SIN CÓDIGO'}
                      </span>
                      {obtenerBadgeRegla(sol)}
                      {tieneFirma1 && tieneFirma2 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          2 de 2 Firmas · COMPLETADO
                        </span>
                      ) : tieneFirma1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          1 de 2 Firmas · Pendiente Gerente de Proyecto
                        </span>
                      ) : tieneFirma2 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          1 de 2 Firmas · Pendiente Jefe de Dependencia
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}
                        >
                          <Clock className="w-3 h-3" />
                          0 de 2 Firmas · Pendiente de Aprobación
                        </span>
                      )}
                    </div>

                    {/* Banner informativo si el usuario ya firmó pero sigue esperando la otra firma */}
                    {yaFirme(sol) && estaEnEsperaOtraFirma(sol) && (
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Usted ya registró su firma institucional en esta comisión.
                        </span>
                        <span className="text-[11px] text-emerald-800">
                          Visible en bandeja hasta que {tieneFirma2 ? 'el Jefe de Dependencia' : 'el Gerente de Proyecto'} firme y avance a <strong>SOLICITADO</strong>.
                        </span>
                      </div>
                    )}

                    {/* Fila de Comisionado */}
                    {(() => {
                      // El backend devuelve los nombres en campos separados (primerNombre, primerApellido, etc.)
                      const nombreFuncionario =
                        (comisionado.primerNombre
                          ? formatearNombreComisionado(comisionado)
                          : comisionado.nombre || sol.nombreComisionado) || 'Funcionario sin nombre';
                      const cedulaFuncionario = comisionado.numeroDocumento || sol.cedulaComisionado || 'N/D';
                      const cargoFuncionario = comisionado.cargo || sol.cargoComisionado || 'Funcionario';

                      return (
                        <div className="flex items-start gap-3 pt-1">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                            {nombreFuncionario ? nombreFuncionario.charAt(0).toUpperCase() : 'F'}
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 leading-snug">
                              {nombreFuncionario}
                            </p>
                            <p className="text-xs text-slate-600">
                              C.C. {cedulaFuncionario} · Cargo:{' '}
                              <span className="font-medium text-slate-800">{cargoFuncionario}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Detalle del It                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                       <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Destino:{' '}
                          <strong className="text-slate-800">
                            {sol.destinoCiudad || sol.ciudadDestino || sol.lugarDestino || 'N/D'}
                            {(sol.destinoDepartamento) ? `, ${sol.destinoDepartamento}` : ''}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Fechas:{' '}
                          <strong className="text-slate-800">
                            {sol.fechaInicio ? new Date(sol.fechaInicio).toLocaleDateString('es-CO') : 'N/D'} al{' '}
                            {sol.fechaFin ? new Date(sol.fechaFin).toLocaleDateString('es-CO') : 'N/D'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Monto Estimado:{' '}
                          <strong className="text-emerald-700">
                            {formatearMoneda(
                              (Number(sol.montoViaticos) || 0) +
                              (Number(sol.montoGastosViaje) || 0) ||
                              sol.montoTotalEstimado || sol.montoTotal || 0
                            )}
                          </strong>
                        </span>
                      </div>
                    </div>                 </div>

                    {/* Objeto de Comisión */}
                    {sol.objetoComision && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        &ldquo;{sol.objetoComision}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Panel de Estado de Firmas y Acciones */}
                  <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-5 space-y-3 shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Firmas del Formato 023
                    </p>

                    {/* Firma 1 */}
                    <div className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                      tieneFirma1 ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          1. Jefe de Dependencia / Desplazamiento:
                        </span>
                        {tieneFirma1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-[#065F46]" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pendiente
                          </span>
                        )}
                      </div>
                      {tieneFirma1 && (
                        <div className="text-[11px] text-slate-700 font-medium">
                          <p>
                            <strong>{firmaJefe.nombreFirmante || firmaJefe.nombre || 'Servidor Autorizado'}</strong>
                            {firmaJefe.emailFirmante ? (
                              <span className="text-slate-500 font-normal"> ({firmaJefe.emailFirmante})</span>
                            ) : null}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {firmaJefe.cargoFirmante ? `${firmaJefe.cargoFirmante} · ` : ''}
                            {new Date(firmaJefe.fechaFirma).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Firma 2 */}
                    <div className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                      tieneFirma2 ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          2. Gerente de Proyecto:
                        </span>
                        {tieneFirma2 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-[#065F46]" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pendiente
                          </span>
                        )}
                      </div>
                      {tieneFirma2 && (
                        <div className="text-[11px] text-slate-700 font-medium">
                          <p>
                            <strong>{firmaGerente.nombreFirmante || firmaGerente.nombre || 'Servidor Autorizado'}</strong>
                            {firmaGerente.emailFirmante ? (
                              <span className="text-slate-500 font-normal"> ({firmaGerente.emailFirmante})</span>
                            ) : null}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {firmaGerente.cargoFirmante ? `${firmaGerente.cargoFirmante} · ` : ''}
                            {new Date(firmaGerente.fechaFirma).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSolicitudParaFirmar(sol);
                          setModalFirmasAbierta(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-98 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
                      >
                        {puedeFirmar ? (
                          <>
                            <FileSignature className="w-4 h-4" />
                            <span>Revisar y Firmar Formato 023</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Revisar Formato 023 (Solo Lectura)</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrevisualizar023(sol)}
                          disabled={descargandoPdfId === sol.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                          title="Ver Formato 023 en visor flotante / mitad de pantalla"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver 023</span>
                        </button>
                        <button
                          onClick={() => handleDescargarPdf(sol)}
                          disabled={descargandoPdfId === sol.id}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                          title="Descargar versión PDF del Formato 023"
                        >
                          <FileDown className={`w-3.5 h-3.5 ${descargandoPdfId === sol.id ? 'animate-bounce' : ''}`} />
                          PDF 023
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Firmas de Aprobación */}
      {modalFirmasAbierta && solicitudParaFirmar && (
        <ModalFirmasAprobacion
          solicitudId={solicitudParaFirmar.id}
          codigoSolicitud={solicitudParaFirmar.codigoSolicitud || solicitudParaFirmar.codigo}
          solicitudInicial={solicitudParaFirmar}
          modoInicialDevolucion={false}
          isOpen={modalFirmasAbierta}
          onClose={() => {
            setModalFirmasAbierta(false);
            setSolicitudParaFirmar(null);
          }}
          onFirmadoExitoso={() => {
            setBusqueda('');
            cargarSolicitudes();
          }}
          onFirmasCompletadas={() => {
            setModalFirmasAbierta(false);
            setSolicitudParaFirmar(null);
            setBusqueda('');
            cargarSolicitudes();
          }}
          onSolicitudDevuelta={() => {
            cargarSolicitudes();
          }}
        />
      )}

      {/* Visor de documentos flotante y divisible */}
      <VisorDocumentosFlotante
        documentos={documentosVisor}
        onCerrar={cerrarDocumentoVisor}
      />
    </div>
  );
};

export default BandejaFirmasAprobacion;
