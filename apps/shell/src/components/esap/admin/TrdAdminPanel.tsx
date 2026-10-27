import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderArchive,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Building,
  Tag,
  Hash,
  ShieldCheck,
  Search,
  RefreshCw,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  Info,
  Clock,
  Check,
  X,
  AlertCircle,
  FileSignature,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  trdService,
  type TrdConfiguracion,
  type TrdSerieSubserie,
  type TrdInput,
  type TrdSerieInput,
} from '../../../services/api/trd.service';

export default function TrdAdminPanel() {
  const [trdList, setTrdList] = useState<TrdConfiguracion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<'ALL' | 'TRD' | 'TVD'>('ALL');

  // Modal TRD
  const [modalTrdOpen, setModalTrdOpen] = useState<boolean>(false);
  const [editingTrd, setEditingTrd] = useState<TrdConfiguracion | null>(null);
  const [formVersion, setFormVersion] = useState<string>('');
  const [formNombre, setFormNombre] = useState<string>('');
  const [formTipo, setFormTipo] = useState<'TRD' | 'TVD'>('TRD');
  const [formFechaInicio, setFormFechaInicio] = useState<string>('');
  const [formFechaFin, setFormFechaFin] = useState<string>('');
  const [formSinFechaFin, setFormSinFechaFin] = useState<boolean>(true);
  const [formActoAdmin, setFormActoAdmin] = useState<string>('');
  const [formConvalidacion, setFormConvalidacion] = useState<string>('');
  const [formDescripcion, setFormDescripcion] = useState<string>('');
  const [formEsVigente, setFormEsVigente] = useState<boolean>(false);
  const [savingTrd, setSavingTrd] = useState<boolean>(false);

  // Modal Serie / Subserie
  const [modalSerieOpen, setModalSerieOpen] = useState<boolean>(false);
  const [selectedTrdForSerie, setSelectedTrdForSerie] = useState<TrdConfiguracion | null>(null);
  const [editingSerie, setEditingSerie] = useState<TrdSerieSubserie | null>(null);
  const [formCodDep, setFormCodDep] = useState<string>('150');
  const [formNomDep, setFormNomDep] = useState<string>('OFICINA DE CONTROL INTERNO DISCIPLINARIO');
  const [formCodSerie, setFormCodSerie] = useState<string>('250');
  const [formNomSerie, setFormNomSerie] = useState<string>('PROCESOS DISCIPLINARIOS');
  const [formCodSubserie, setFormCodSubserie] = useState<string>('05');
  const [formNomSubserie, setFormNomSubserie] = useState<string>('PROCESOS DISCIPLINARIOS');
  const [formModulo, setFormModulo] = useState<string>('control-disciplinario');
  const [savingSerie, setSavingSerie] = useState<boolean>(false);

  // Carga de datos
  const loadTrdList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trdService.getTrdList();
      setTrdList(data);
    } catch (err: any) {
      toast.error('Error al cargar la parametrización de TRD/TVD: ' + (err?.message || 'Error de red'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrdList();
  }, [loadTrdList]);

  // Métricas
  const metricas = useMemo(() => {
    const total = trdList.length;
    const vigente = trdList.find((t) => t.esVigente);
    const seriesCount = trdList.reduce((acc, t) => acc + (t.series?.length || 0), 0);
    const tvdCount = trdList.filter((t) => t.tipo === 'TVD').length;
    return { total, vigente, seriesCount, tvdCount };
  }, [trdList]);

  // Filtrado
  const filteredTrdList = useMemo(() => {
    return trdList.filter((t) => {
      if (filterTipo !== 'ALL' && t.tipo !== filterTipo) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        t.version.toLowerCase().includes(q) ||
        t.nombre.toLowerCase().includes(q) ||
        t.actoAdministrativo.toLowerCase().includes(q) ||
        t.convalidacionEstado.toLowerCase().includes(q) ||
        t.series?.some(
          (s) =>
            s.codigoSerie.includes(q) ||
            s.codigoSubserie.includes(q) ||
            s.codigoDependencia.includes(q) ||
            s.nombreSerie.toLowerCase().includes(q),
        )
      );
    });
  }, [trdList, filterTipo, searchTerm]);

  // Abrir Modal TRD para Crear
  const handleOpenCreateTrd = () => {
    setEditingTrd(null);
    setFormVersion('');
    setFormNombre('');
    setFormTipo('TRD');
    setFormFechaInicio(new Date().toISOString().substring(0, 10));
    setFormFechaFin('');
    setFormSinFechaFin(true);
    setFormActoAdmin('');
    setFormConvalidacion('');
    setFormDescripcion('');
    setFormEsVigente(false);
    setModalTrdOpen(true);
  };

  // Abrir Modal TRD para Editar
  const handleOpenEditTrd = (trd: TrdConfiguracion) => {
    setEditingTrd(trd);
    setFormVersion(trd.version);
    setFormNombre(trd.nombre);
    setFormTipo(trd.tipo);
    setFormFechaInicio(trd.fechaInicio ? trd.fechaInicio.substring(0, 10) : '');
    setFormFechaFin(trd.fechaFin ? trd.fechaFin.substring(0, 10) : '');
    setFormSinFechaFin(!trd.fechaFin);
    setFormActoAdmin(trd.actoAdministrativo);
    setFormConvalidacion(trd.convalidacionEstado);
    setFormDescripcion(trd.descripcion || '');
    setFormEsVigente(trd.esVigente);
    setModalTrdOpen(true);
  };

  // Guardar TRD
  const handleSaveTrd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVersion.trim() || !formNombre.trim() || !formFechaInicio || !formActoAdmin.trim() || !formConvalidacion.trim()) {
      toast.warning('Por favor diligencie todos los campos requeridos marcados con *');
      return;
    }

    try {
      setSavingTrd(true);
      const payload: Partial<TrdInput> = {
        version: formVersion.trim(),
        nombre: formNombre.trim(),
        tipo: formTipo,
        fechaInicio: formFechaInicio,
        fechaFin: formSinFechaFin ? null : formFechaFin || null,
        actoAdministrativo: formActoAdmin.trim(),
        convalidacionEstado: formConvalidacion.trim(),
        descripcion: formDescripcion.trim() || null,
        esVigente: formEsVigente,
      };

      if (editingTrd) {
        await trdService.updateTrd(editingTrd.id, payload);
        toast.success(`Versión ${payload.version} actualizada con éxito`);
      } else {
        await trdService.createTrd(payload);
        toast.success(`Versión ${payload.version} creada con éxito`);
      }

      setModalTrdOpen(false);
      await loadTrdList();
    } catch (err: any) {
      toast.error('Error al guardar la TRD: ' + (err?.response?.data?.message || err?.message || 'Error desconocido'));
    } finally {
      setSavingTrd(false);
    }
  };

  // Alternar Activo TRD
  const handleToggleTrdActivo = async (trd: TrdConfiguracion) => {
    if (trd.esVigente && trd.activo) {
      toast.warning('La versión vigente debe permanecer activa.');
      return;
    }
    try {
      await trdService.toggleTrdActivo(trd.id);
      toast.success(`TRD ${trd.version} ${trd.activo ? 'desactivada' : 'activada'} correctamente`);
      await loadTrdList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Error al cambiar estado');
    }
  };

  // Marcar como Vigente
  const handleSetVigente = async (trd: TrdConfiguracion) => {
    try {
      await trdService.setTrdVigente(trd.id);
      toast.success(`Versión ${trd.version} establecida como la TRD vigente oficial de la institución`);
      await loadTrdList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Error al cambiar versión vigente');
    }
  };

  // Abrir Modal Serie
  const handleOpenCreateSerie = (trd: TrdConfiguracion) => {
    setSelectedTrdForSerie(trd);
    setEditingSerie(null);
    if (trd.version === 'TRD V3') {
      setFormCodDep('130.2');
      setFormNomDep('OFICINA DE CONTROL INTERNO DISCIPLINARIO');
      setFormCodSerie('1330');
      setFormNomSerie('PROCESOS JURÍDICOS');
      setFormCodSubserie('60');
      setFormNomSubserie('PROCESOS DISCIPLINARIOS');
    } else if (trd.version === 'TRD V2') {
      setFormCodDep('10200');
      setFormNomDep('OFICINA DE CONTROL INTERNO DISCIPLINARIO');
      setFormCodSerie('68');
      setFormNomSerie('PROCESOS JURÍDICOS');
      setFormCodSubserie('22');
      setFormNomSubserie('PROCESOS DISCIPLINARIOS');
    } else if (trd.version === 'TRD V1') {
      setFormCodDep('1101');
      setFormNomDep('OFICINA DE CONTROL INTERNO DISCIPLINARIO');
      setFormCodSerie('75');
      setFormNomSerie('PROCESOS');
      setFormCodSubserie('01');
      setFormNomSubserie('PROCESOS DISCIPLINARIOS');
    } else {
      // TRD V4 Vigente u otras
      setFormCodDep('150');
      setFormNomDep('OFICINA DE CONTROL INTERNO DISCIPLINARIO');
      setFormCodSerie('250');
      setFormNomSerie('PROCESOS JURÍDICOS');
      setFormCodSubserie('05');
      setFormNomSubserie('PROCESOS DISCIPLINARIOS');
    }
    setFormModulo('control-disciplinario');
    setModalSerieOpen(true);
  };

  const handleOpenEditSerie = (trd: TrdConfiguracion, serie: TrdSerieSubserie) => {
    setSelectedTrdForSerie(trd);
    setEditingSerie(serie);
    setFormCodDep(serie.codigoDependencia);
    setFormNomDep(serie.nombreDependencia);
    setFormCodSerie(serie.codigoSerie);
    setFormNomSerie(serie.nombreSerie);
    setFormCodSubserie(serie.codigoSubserie);
    setFormNomSubserie(serie.nombreSubserie);
    setFormModulo(serie.modulo);
    setModalSerieOpen(true);
  };

  // Guardar Serie / Subserie
  const handleSaveSerie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodDep.trim() || !formCodSerie.trim() || !formNomSerie.trim() || !formCodSubserie.trim() || !formNomSubserie.trim()) {
      toast.warning('Diligencie todos los campos de la serie y subserie');
      return;
    }

    try {
      setSavingSerie(true);
      const payload: Partial<TrdSerieInput> = {
        codigoDependencia: formCodDep.trim(),
        nombreDependencia: formNomDep.trim(),
        codigoSerie: formCodSerie.trim(),
        nombreSerie: formNomSerie.trim(),
        codigoSubserie: formCodSubserie.trim(),
        nombreSubserie: formNomSubserie.trim(),
        codigoIdentificacionExpediente: `12_${formCodDep.trim()}_${formCodSerie.trim()}_${formCodSubserie.trim()}`,
        modulo: formModulo.trim(),
      };

      if (editingSerie) {
        await trdService.updateSerie(editingSerie.id, payload);
        toast.success(`Serie ${payload.codigoSerie} y Subserie ${payload.codigoSubserie} actualizadas`);
      } else if (selectedTrdForSerie) {
        await trdService.addSerie(selectedTrdForSerie.id, payload);
        toast.success(`Serie ${payload.codigoSerie} y Subserie ${payload.codigoSubserie} asociadas a ${selectedTrdForSerie.version}`);
      }

      setModalSerieOpen(false);
      await loadTrdList();
    } catch (err: any) {
      toast.error('Error al guardar la serie: ' + (err?.response?.data?.message || err?.message || 'Error'));
    } finally {
      setSavingSerie(false);
    }
  };

  // Alternar Activo Serie
  const handleToggleSerie = async (serie: TrdSerieSubserie) => {
    try {
      await trdService.toggleSerieActivo(serie.id);
      toast.success(`Serie ${serie.codigoSerie} ${serie.activo ? 'desactivada' : 'activada'}`);
      await loadTrdList();
    } catch (err: any) {
      toast.error(err?.message || 'Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Métrica 1: Versión Vigente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              TRD Vigente Actual
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {metricas.vigente?.version || 'Sin configurar'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Vigente
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
              {metricas.vigente?.actoAdministrativo || 'Acuerdo vigente institucional'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Métrica 2: Código Serie / Subserie Vigente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Serie / Subserie Activa
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {metricas.vigente?.series?.[0]
                  ? `${metricas.vigente.series[0].codigoSerie} / ${metricas.vigente.series[0].codigoSubserie}`
                  : '250 / 05'}
              </span>
              <span className="text-xs font-medium text-slate-600">
                Dep: {metricas.vigente?.series?.[0]?.codigoDependencia || '150'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
              {metricas.vigente?.series?.[0]?.nombreSerie || 'PROCESOS DISCIPLINARIOS'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Hash className="w-6 h-6" />
          </div>
        </div>

        {/* Métrica 3: Total Versiones Registradas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Versiones Catalogadas
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metricas.total}</span>
              <span className="text-xs text-slate-500">periodos archivísticos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {metricas.seriesCount} serie(s) parametrizada(s)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Métrica 4: Soporte Normativo y Decreto */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Acreditación AGN / CDA
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 truncate max-w-[190px]">
                {metricas.vigente?.convalidacionEstado || 'Convalidada AGN y RUSD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Clasificación documental blindada
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NOTA INFORMATIVA DE NORMATIVA ARCHIVÍSTICA */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-900">
            Regla de Parametrización y Clasificación Documental Histórica
          </p>
          <p>
            Cualquier actualización en la TRD institucional, códigos de serie o subserie toma vigencia automática para nuevos documentos y expedientes.
            Los documentos ya registrados conservan su codificación de adopción histórica según su fecha extrema de radicación para garantizar la integridad archivística con la normatividad AGN.
          </p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y ACCIONES */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por versión, código serie, decreto o convalidación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Tipo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterTipo('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTipo === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({trdList.length})
            </button>
            <button
              onClick={() => setFilterTipo('TRD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTipo === 'TRD'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TRD ({trdList.filter((t) => t.tipo === 'TRD').length})
            </button>
            <button
              onClick={() => setFilterTipo('TVD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTipo === 'TVD'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TVD ({trdList.filter((t) => t.tipo === 'TVD').length})
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTrdList}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#003DA5]' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateTrd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-sm hover:shadow transition-all"
            style={{ backgroundColor: '#003DA5' }}
          >
            <Plus className="w-4 h-4" />
            Nueva Versión TRD / TVD
          </button>
        </div>
      </div>

      {/* LISTADO DE VERSIONES DE TRD */}
      <div className="space-y-4">
        {loading && trdList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <RefreshCw className="w-8 h-8 text-[#003DA5] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Cargando catálogo maestro de TRD...</p>
          </div>
        ) : filteredTrdList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No se encontraron versiones de TRD</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'Intente ajustando el término de búsqueda o el filtro de tipo.' : 'Haga clic en "Nueva Versión TRD" para registrar una versión archivística.'}
            </p>
          </div>
        ) : (
          filteredTrdList.map((trd) => {
            const esVigente = trd.esVigente;
            const tieneSeries = trd.series && trd.series.length > 0;

            return (
              <motion.div
                key={trd.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  esVigente
                    ? 'border-blue-300 shadow-md ring-1 ring-blue-200/60'
                    : 'border-slate-200/80 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* CABECERA DE LA TRD */}
                <div
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b ${
                    esVigente ? 'bg-gradient-to-r from-blue-50/50 to-white border-blue-100' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        esVigente
                          ? 'bg-[#003DA5] text-white shadow-sm'
                          : trd.tipo === 'TVD'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {trd.tipo}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 truncate">{trd.version}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            trd.tipo === 'TVD'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {trd.tipo}
                        </span>

                        {esVigente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            VIGENTE ACTUAL
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            trd.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {trd.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                        {trd.nombre}
                      </p>
                    </div>
                  </div>

                  {/* Acciones de TRD */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!esVigente && (
                      <button
                        onClick={() => handleSetVigente(trd)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
                        title="Establecer como la TRD vigente actual"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Hacer Vigente
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleTrdActivo(trd)}
                      disabled={esVigente && trd.activo}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                        trd.activo
                          ? 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {trd.activo ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => handleOpenEditTrd(trd)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      Editar TRD
                    </button>

                    <button
                      onClick={() => handleOpenCreateSerie(trd)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-all"
                      style={{ backgroundColor: '#003DA5' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Serie
                    </button>
                  </div>
                </div>

                {/* METADATOS NORMATIVOS (RANGO, ACTO, CONVALIDACIÓN) */}
                <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Rango Fechas */}
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-[#003DA5] flex-shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-500">Rango Fechas de Aplicación:</span>
                      <span className="font-medium text-slate-900">
                        {trd.fechaInicio} — {trd.fechaFin || 'Actualidad'}
                      </span>
                    </div>
                  </div>

                  {/* Acto Administrativo */}
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileSignature className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block text-slate-500">Acto Administrativo de Adopción:</span>
                      <span className="font-medium text-slate-900 truncate" title={trd.actoAdministrativo}>
                        {trd.actoAdministrativo}
                      </span>
                    </div>
                  </div>

                  {/* Convalidación */}
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block text-slate-500">Convalidación / Estado:</span>
                      <span className="font-medium text-slate-900 truncate" title={trd.convalidacionEstado}>
                        {trd.convalidacionEstado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SERIES Y SUBSERIES ASOCIADAS */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#003DA5]" />
                      Series y Subseries Asociadas ({trd.series?.length || 0})
                    </h4>
                  </div>

                  {!tieneSeries ? (
                    <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500">
                        Esta versión de TRD aún no tiene series ni subseries configuradas.
                      </p>
                      <button
                        onClick={() => handleOpenCreateSerie(trd)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#003DA5] hover:underline"
                      >
                        <Plus className="w-3 h-3" /> Asociar primera serie / subserie
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {trd.series!.map((serie) => (
                        <div
                          key={serie.id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 text-xs flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                                Dep. {serie.codigoDependencia}
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-blue-50 text-[#003DA5] text-[11px] border border-blue-200">
                                Serie {serie.codigoSerie}
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-50 text-indigo-700 text-[11px] border border-indigo-200">
                                Sub. {serie.codigoSubserie}
                              </span>
                            </div>

                            <p className="font-semibold text-slate-900 truncate" title={serie.nombreSerie}>
                              {serie.codigoSerie} – {serie.nombreSerie}
                            </p>
                            <p className="text-slate-600 truncate" title={serie.nombreSubserie}>
                              Subserie: {serie.codigoSubserie} – {serie.nombreSubserie}
                            </p>

                            <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                              <span>Identificador:</span>
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">
                                {serie.codigoIdentificacionExpediente || `12_${serie.codigoDependencia}_${serie.codigoSerie}_${serie.codigoSubserie}`}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleToggleSerie(serie)}
                              className={`p-1.5 rounded-lg border text-xs transition-all ${
                                serie.activo
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                  : 'text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={serie.activo ? 'Desactivar serie' : 'Activar serie'}
                            >
                              {serie.activo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleOpenEditSerie(trd, serie)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all"
                              title="Editar serie / subserie"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR / EDITAR TRD */}
      <AnimatePresence>
        {modalTrdOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: '#003DA5' }}>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-white" />
                  {editingTrd ? `Editar ${editingTrd.version}` : 'Nueva Versión TRD / TVD'}
                </h3>
                <button
                  onClick={() => setModalTrdOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTrd} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Versión TRD / TVD *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: TRD V4 o TVD V1"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tipo de Tabla *
                    </label>
                    <select
                      value={formTipo}
                      onChange={(e) => setFormTipo(e.target.value as 'TRD' | 'TVD')}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    >
                      <option value="TRD">TRD (Retención Documental)</option>
                      <option value="TVD">TVD (Valoración Documental)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nombre Descriptivo de la Versión *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Tabla de Retención Documental V4 (Vigente)"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Fecha Inicio de Aplicación *
                    </label>
                    <input
                      type="date"
                      required
                      value={formFechaInicio}
                      onChange={(e) => setFormFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Fecha Fin de Aplicación
                    </label>
                    <input
                      type="date"
                      disabled={formSinFechaFin}
                      value={formFechaFin}
                      onChange={(e) => setFormFechaFin(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] disabled:opacity-50"
                    />
                    <label className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSinFechaFin}
                        onChange={(e) => {
                          setFormSinFechaFin(e.target.checked);
                          if (e.target.checked) setFormFechaFin('');
                        }}
                        className="rounded text-[#003DA5] focus:ring-[#003DA5]"
                      />
                      Vigente (hasta la actualidad / abierta)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Acto Administrativo de Adopción (Decreto / Resolución) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Resolución Vigente (Acuerdo 004/2019)"
                    value={formActoAdmin}
                    onChange={(e) => setFormActoAdmin(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Convalidación / Estado Archivístico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Certificado Convalidación AGN y RUSD"
                    value={formConvalidacion}
                    onChange={(e) => setFormConvalidacion(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Descripción / Observaciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Notas archivísticas o normativas adicionales..."
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsVigente}
                      onChange={(e) => setFormEsVigente(e.target.checked)}
                      className="rounded text-[#003DA5] focus:ring-[#003DA5]"
                    />
                    Establecer como la TRD Vigente Oficial de la Plataforma
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalTrdOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTrd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all"
                    style={{ backgroundColor: '#003DA5' }}
                  >
                    {savingTrd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {editingTrd ? 'Guardar Cambios' : 'Crear Versión TRD'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CREAR / EDITAR SERIE Y SUBSERIE */}
      <AnimatePresence>
        {modalSerieOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: '#003DA5' }}>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Hash className="w-5 h-5 text-white" />
                  {editingSerie ? 'Editar Serie y Subserie' : `Asociar Serie a ${selectedTrdForSerie?.version}`}
                </h3>
                <button
                  onClick={() => setModalSerieOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSerie} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Código Dependencia *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 150 o 160"
                      value={formCodDep}
                      onChange={(e) => setFormCodDep(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Módulo Asociado
                    </label>
                    <select
                      value={formModulo}
                      onChange={(e) => setFormModulo(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    >
                      <option value="control-disciplinario">Control Disciplinario</option>
                      <option value="control-interno">Control Interno</option>
                      <option value="gestion-legal">Gestión Legal</option>
                      <option value="general">Transversal General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nombre Dependencia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: OFICINA DE CONTROL INTERNO DISCIPLINARIO"
                    value={formNomDep}
                    onChange={(e) => setFormNomDep(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Código de la Serie *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 250 (vigente), 1330 o 68"
                      value={formCodSerie}
                      onChange={(e) => setFormCodSerie(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nombre de la Serie *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: PROCESOS JURÍDICOS"
                      value={formNomSerie}
                      onChange={(e) => setFormNomSerie(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Subcódigo Serie (Subserie) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 05 (vigente) o 60"
                      value={formCodSubserie}
                      onChange={(e) => setFormCodSubserie(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nombre de la Subserie *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: PROCESOS DISCIPLINARIOS"
                      value={formNomSubserie}
                      onChange={(e) => setFormNomSubserie(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-700">Previsualización Identificador de Expediente:</span>
                  <p className="font-mono text-[#003DA5] font-bold">
                    12_{formCodDep || '150'}_{formCodSerie || '250'}_{formCodSubserie || '05'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalSerieOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSerie}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all"
                    style={{ backgroundColor: '#003DA5' }}
                  >
                    {savingSerie && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {editingSerie ? 'Guardar Cambios' : 'Asociar Serie'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
