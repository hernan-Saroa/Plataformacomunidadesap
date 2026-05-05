/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useConfiguracionAuditorias
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para cargar y gestionar configuraciones de auditoría desde el backend.
 * Combina:
 * - Tipos de Auditoría
 * - Listas de Chequeo
 * 
 * Sigue el patrón de useAuditoriasKanban para consistencia.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Servicios de tipos de auditoría
import {
  cargarTiposAuditoria,
  crearTipoAuditoria,
  actualizarTipoAuditoria,
  eliminarTipoAuditoria,
  mapearTipoAuditoriaBackendAFrontend,
  mapearTipoAuditoriaFrontendABackend,
} from './tiposAuditoriaService';
import type { TipoAuditoria as TipoAuditoriaBackend } from '../../../../services/api/tiposAuditoriaService';

// Servicios de listas de chequeo
import {
  cargarListasChequeo,
  crearListaChequeo,
  actualizarListaChequeo,
  eliminarListaChequeo,
  mapearListaChequeoBackendAFrontend,
  type ListaChequeoFrontend,
  type ItemChequeo,
} from './listasChequeoService';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS FRONTEND (para el componente)
// ═══════════════════════════════════════════════════════════════════════════

export interface TipoAuditoriaFrontend {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  alcance: string;
  duracionPromedio: number;
  equipoPromedio: number;
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
}

export interface ListaChequeoFE {
  id: string;
  nombre: string;
  tipoAuditoria: string;
  tipoAuditoriaId?: string;
  descripcion: string;
  items: ItemChequeo[];
  activa: boolean;
  usosProgramados: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE DEL HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseConfiguracionAuditoriasResult {
  // Estado
  tiposAuditoria: TipoAuditoriaFrontend[];
  listasChequeo: ListaChequeoFE[];
  loading: boolean;
  error: string | null;
  cambiosSinGuardar: boolean;

  // Acciones para Tipos de Auditoría
  crearTipo: (tipo: Omit<TipoAuditoriaFrontend, 'id' | 'auditoriasProgramadas'>) => Promise<TipoAuditoriaFrontend | null>;
  actualizarTipo: (id: string, tipo: Partial<TipoAuditoriaFrontend>) => Promise<TipoAuditoriaFrontend | null>;
  eliminarTipo: (id: string) => Promise<boolean>;

  // Acciones para Listas de Chequeo
  crearLista: (lista: Omit<ListaChequeoFE, 'id' | 'fechaCreacion' | 'ultimaActualizacion' | 'usosProgramados'>) => Promise<ListaChequeoFE | null>;
  actualizarLista: (id: string, lista: Partial<ListaChequeoFE>) => Promise<ListaChequeoFE | null>;
  eliminarLista: (id: string) => Promise<boolean>;

  // Utilidades
  recargarDatos: () => Promise<void>;
  setCambiosSinGuardar: (value: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function useConfiguracionAuditorias(): UseConfiguracionAuditoriasResult {
  // Estado
  const [tiposAuditoria, setTiposAuditoria] = useState<TipoAuditoriaFrontend[]>([]);
  const [listasChequeo, setListasChequeo] = useState<ListaChequeoFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARGA INICIAL DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 [useConfiguracionAuditorias] Cargando datos...');
      
      // Cargar en paralelo
      const [tiposResponse, listasResponse] = await Promise.all([
        cargarTiposAuditoria(true), // incluir inactivos
        cargarListasChequeo(true),  // incluir inactivas
      ]);

      console.log(`✅ [useConfiguracionAuditorias] ${tiposResponse.length} tipos cargados`);
      console.log(`✅ [useConfiguracionAuditorias] ${listasResponse.length} listas cargadas`);

      // Mapear tipos de auditoría - ahora ya vienen mapeados del servicio
      const tiposMapeados: TipoAuditoriaFrontend[] = tiposResponse.map((t: TipoAuditoriaBackend) => ({
        id: t.id,
        codigo: t.codigo,
        nombre: t.nombre,
        descripcion: t.descripcion || '',
        alcance: t.alcance || '',
        duracionPromedio: t.duracionPromedio,
        equipoPromedio: t.equipoPromedio,
        color: t.color,
        activa: t.activa,
        auditoriasProgramadas: t.auditoriasProgramadas || 0,
      }));

      // Listas ya vienen mapeadas del servicio
      const listasMapeadas: ListaChequeoFE[] = listasResponse.map((l: ListaChequeoFrontend) => ({
        id: l.id,
        nombre: l.nombre,
        tipoAuditoria: l.tipoAuditoria,
        tipoAuditoriaId: l.tipoAuditoriaId,
        descripcion: l.descripcion,
        items: l.items,
        activa: l.activa,
        usosProgramados: l.usosProgramados,
        fechaCreacion: l.fechaCreacion,
        ultimaActualizacion: l.ultimaActualizacion,
      }));

      setTiposAuditoria(tiposMapeados);
      setListasChequeo(listasMapeadas);
      
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useConfiguracionAuditorias] Error cargando datos:', mensaje);
      setError(mensaje);
      toast.error('Error cargando configuración', { description: mensaje });
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERACIONES PARA TIPOS DE AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════════════

  const crearTipo = useCallback(async (
    tipo: Omit<TipoAuditoriaFrontend, 'id' | 'auditoriasProgramadas'>
  ): Promise<TipoAuditoriaFrontend | null> => {
    try {
      const nuevoTipo = await crearTipoAuditoria({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion || undefined,
        alcance: tipo.alcance || undefined,
        duracionPromedio: tipo.duracionPromedio,
        equipoPromedio: tipo.equipoPromedio,
        color: tipo.color,
        activa: tipo.activa,
      });

      if (nuevoTipo) {
        const tipoMapeado: TipoAuditoriaFrontend = {
          id: nuevoTipo.id,
          codigo: nuevoTipo.codigo,
          nombre: nuevoTipo.nombre,
          descripcion: nuevoTipo.descripcion || '',
          alcance: nuevoTipo.alcance || '',
          duracionPromedio: nuevoTipo.duracionPromedio,
          equipoPromedio: nuevoTipo.equipoPromedio,
          color: nuevoTipo.color,
          activa: nuevoTipo.activa,
          auditoriasProgramadas: nuevoTipo.auditoriasProgramadas || 0,
        };
        
        setTiposAuditoria(prev => [...prev, tipoMapeado]);
        return tipoMapeado;
      }
      return null;
    } catch (err) {
      console.error('Error creando tipo de auditoría:', err);
      return null;
    }
  }, []);

  const actualizarTipo = useCallback(async (
    id: string,
    datos: Partial<TipoAuditoriaFrontend>
  ): Promise<TipoAuditoriaFrontend | null> => {
    try {
      const tipoActualizado = await actualizarTipoAuditoria(id, {
        codigo: datos.codigo,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        alcance: datos.alcance,
        duracionPromedio: datos.duracionPromedio,
        equipoPromedio: datos.equipoPromedio,
        color: datos.color,
        activa: datos.activa,
      });

      if (tipoActualizado) {
        const tipoMapeado: TipoAuditoriaFrontend = {
          id: tipoActualizado.id,
          codigo: tipoActualizado.codigo,
          nombre: tipoActualizado.nombre,
          descripcion: tipoActualizado.descripcion || '',
          alcance: tipoActualizado.alcance || '',
          duracionPromedio: tipoActualizado.duracionPromedio,
          equipoPromedio: tipoActualizado.equipoPromedio,
          color: tipoActualizado.color,
          activa: tipoActualizado.activa,
          auditoriasProgramadas: tipoActualizado.auditoriasProgramadas || 0,
        };

        setTiposAuditoria(prev => 
          prev.map(t => t.id === id ? tipoMapeado : t)
        );
        return tipoMapeado;
      }
      return null;
    } catch (err) {
      console.error('Error actualizando tipo de auditoría:', err);
      return null;
    }
  }, []);

  const eliminarTipoHandler = useCallback(async (id: string): Promise<boolean> => {
    // Verificar si tiene auditorías asociadas
    const tipo = tiposAuditoria.find(t => t.id === id);
    if (tipo && tipo.auditoriasProgramadas > 0) {
      toast.error('No se puede eliminar', {
        description: `Este tipo tiene ${tipo.auditoriasProgramadas} auditorías asociadas`
      });
      return false;
    }

    const exito = await eliminarTipoAuditoria(id);
    if (exito) {
      setTiposAuditoria(prev => prev.filter(t => t.id !== id));
    }
    return exito;
  }, [tiposAuditoria]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERACIONES PARA LISTAS DE CHEQUEO
  // ═══════════════════════════════════════════════════════════════════════════

  const crearLista = useCallback(async (
    lista: Omit<ListaChequeoFE, 'id' | 'fechaCreacion' | 'ultimaActualizacion' | 'usosProgramados'>
  ): Promise<ListaChequeoFE | null> => {
    try {
      // Pasar los tipos de auditoría para resolver el ID
      const tiposParaResolver = tiposAuditoria.map(t => ({ id: t.id, nombre: t.nombre }));
      
      const nuevaLista = await crearListaChequeo(lista, tiposParaResolver);

      if (nuevaLista) {
        const listaMapeada: ListaChequeoFE = {
          id: nuevaLista.id,
          nombre: nuevaLista.nombre,
          tipoAuditoria: nuevaLista.tipoAuditoria,
          tipoAuditoriaId: nuevaLista.tipoAuditoriaId,
          descripcion: nuevaLista.descripcion,
          items: nuevaLista.items,
          activa: nuevaLista.activa,
          usosProgramados: nuevaLista.usosProgramados,
          fechaCreacion: nuevaLista.fechaCreacion,
          ultimaActualizacion: nuevaLista.ultimaActualizacion,
        };

        setListasChequeo(prev => [...prev, listaMapeada]);
        return listaMapeada;
      }
      return null;
    } catch (err) {
      console.error('Error creando lista de chequeo:', err);
      return null;
    }
  }, [tiposAuditoria]);

  const actualizarListaHandler = useCallback(async (
    id: string,
    datos: Partial<ListaChequeoFE>
  ): Promise<ListaChequeoFE | null> => {
    try {
      // Obtener la lista actual para preservar datos
      const listaActual = listasChequeo.find(l => l.id === id);
      if (!listaActual) {
        toast.error('Lista no encontrada');
        return null;
      }

      // Combinar datos actuales con los nuevos
      const datosCompletos = {
        ...listaActual,
        ...datos,
      };

      // Pasar los tipos de auditoría para resolver el ID
      const tiposParaResolver = tiposAuditoria.map(t => ({ id: t.id, nombre: t.nombre }));
      
      const listaActualizada = await actualizarListaChequeo(id, datosCompletos, tiposParaResolver);

      if (listaActualizada) {
        const listaMapeada: ListaChequeoFE = {
          id: listaActualizada.id,
          nombre: listaActualizada.nombre,
          tipoAuditoria: listaActualizada.tipoAuditoria,
          tipoAuditoriaId: listaActualizada.tipoAuditoriaId,
          descripcion: listaActualizada.descripcion,
          items: listaActualizada.items,
          activa: listaActualizada.activa,
          usosProgramados: listaActualizada.usosProgramados,
          fechaCreacion: listaActualizada.fechaCreacion,
          ultimaActualizacion: listaActualizada.ultimaActualizacion,
        };

        setListasChequeo(prev => 
          prev.map(l => l.id === id ? listaMapeada : l)
        );
        return listaMapeada;
      }
      return null;
    } catch (err) {
      console.error('Error actualizando lista de chequeo:', err);
      return null;
    }
  }, [listasChequeo, tiposAuditoria]);

  const eliminarListaHandler = useCallback(async (id: string): Promise<boolean> => {
    // Verificar si tiene usos programados
    const lista = listasChequeo.find(l => l.id === id);
    if (lista && lista.usosProgramados > 0) {
      toast.error('No se puede eliminar', {
        description: `Esta lista tiene ${lista.usosProgramados} usos programados`
      });
      return false;
    }

    const exito = await eliminarListaChequeo(id);
    if (exito) {
      setListasChequeo(prev => prev.filter(l => l.id !== id));
    }
    return exito;
  }, [listasChequeo]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNAR RESULTADO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estado
    tiposAuditoria,
    listasChequeo,
    loading,
    error,
    cambiosSinGuardar,

    // Acciones para Tipos de Auditoría
    crearTipo,
    actualizarTipo,
    eliminarTipo: eliminarTipoHandler,

    // Acciones para Listas de Chequeo
    crearLista,
    actualizarLista: actualizarListaHandler,
    eliminarLista: eliminarListaHandler,

    // Utilidades
    recargarDatos: cargarDatos,
    setCambiosSinGuardar,
  };
}

export default useConfiguracionAuditorias;
