/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useScopeFilter
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Carga el scope_config del rol del usuario actual desde Supabase
 * y proporciona funciones de filtrado para aplicar en cada módulo.
 * 
 * Tipos de alcance:
 * - 'global': sin filtros, acceso a todo
 * - 'territorial': filtra por territoriales permitidas
 * - 'cetap': filtra por CETAPs permitidos
 * - 'programa': filtra por programas permitidos
 * - 'personalizado': combinación de los anteriores
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { scopeService } from '../services/api/supabase.service';

export interface ScopeConfig {
  tipo_alcance: 'global' | 'territorial' | 'cetap' | 'programa' | 'personalizado';
  territoriales: string[];
  cetaps: string[];
  programas: string[];
  descripcion_alcance: string;
}

const DEFAULT_SCOPE: ScopeConfig = {
  tipo_alcance: 'global',
  territoriales: [],
  cetaps: [],
  programas: [],
  descripcion_alcance: 'Acceso global'
};

export function useScopeFilter() {
  const [scopeConfig, setScopeConfig] = useState<ScopeConfig>(DEFAULT_SCOPE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScope();
  }, []);

  const loadScope = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await scopeService.getUserScope();
      if (data.success && data.data) {
        setScopeConfig(data.data);
      }
      // If !data.success, keep default global scope — no error needed
    } catch (err: any) {
      // Graceful fallback: keep default global scope, log but don't propagate error
      console.warn('[useScopeFilter] Scope load failed, using global default:', err?.message || err);
      // Don't set error — global scope is a safe fallback
    } finally {
      setIsLoading(false);
    }
  };

  const isGlobal = scopeConfig.tipo_alcance === 'global';

  /**
   * Filtra un array de personas/usuarios por territorial
   * Busca en campos: territorial, territorial_id, sede_territorial, sede
   */
  const filterByTerritorial = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (isGlobal || scopeConfig.territoriales.length === 0) return items;
    return items.filter(item => {
      const territorialId = item.territorial_id || item.territorial || item.sede_territorial || item.sede || '';
      const territorialNombre = item.territorial_nombre || item.nombre_territorial || '';
      return scopeConfig.territoriales.some(t => 
        territorialId === t || 
        territorialNombre === t ||
        String(territorialId).includes(t) ||
        String(t).includes(String(territorialId))
      );
    });
  }, [isGlobal, scopeConfig.territoriales]);

  /**
   * Filtra por CETAP
   * Busca en campos: cetap, cetap_id, cetap_nombre
   */
  const filterByCetap = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (isGlobal || scopeConfig.cetaps.length === 0) return items;
    return items.filter(item => {
      const cetapId = item.cetap_id || item.cetap || '';
      const cetapNombre = item.cetap_nombre || item.nombre_cetap || '';
      return scopeConfig.cetaps.some(c => 
        cetapId === c || 
        cetapNombre === c ||
        String(cetapId).includes(c) ||
        String(c).includes(String(cetapId))
      );
    });
  }, [isGlobal, scopeConfig.cetaps]);

  /**
   * Filtra por programa académico
   * Busca en campos: programa, programa_id, programa_academico
   */
  const filterByPrograma = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (isGlobal || scopeConfig.programas.length === 0) return items;
    return items.filter(item => {
      const programaId = item.programa_id || item.programa || item.programa_academico || '';
      const programaNombre = item.programa_nombre || item.nombre_programa || item.program || '';
      return scopeConfig.programas.some(p => 
        programaId === p || 
        programaNombre === p ||
        String(programaId).includes(p) ||
        String(p).includes(String(programaId))
      );
    });
  }, [isGlobal, scopeConfig.programas]);

  /**
   * Aplica TODOS los filtros de scope relevantes a un array de items
   * Combina territorial + cetap + programa según el tipo de alcance
   */
  const applyAllFilters = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (isGlobal) return items;

    let filtered = items;

    // Aplicar filtros según el tipo de alcance
    if (scopeConfig.tipo_alcance === 'territorial' || scopeConfig.tipo_alcance === 'personalizado') {
      if (scopeConfig.territoriales.length > 0) {
        filtered = filterByTerritorial(filtered);
      }
    }

    if (scopeConfig.tipo_alcance === 'cetap' || scopeConfig.tipo_alcance === 'personalizado') {
      if (scopeConfig.cetaps.length > 0) {
        filtered = filterByCetap(filtered);
      }
    }

    if (scopeConfig.tipo_alcance === 'programa' || scopeConfig.tipo_alcance === 'personalizado') {
      if (scopeConfig.programas.length > 0) {
        filtered = filterByPrograma(filtered);
      }
    }

    return filtered;
  }, [isGlobal, scopeConfig, filterByTerritorial, filterByCetap, filterByPrograma]);

  /**
   * Badge descriptivo del scope actual para mostrar en la UI
   */
  const scopeBadge = useMemo(() => {
    if (isGlobal) return { label: 'Acceso Global', color: 'bg-green-100 text-green-800' };
    if (scopeConfig.tipo_alcance === 'territorial') return { label: `Territorial (${scopeConfig.territoriales.length})`, color: 'bg-blue-100 text-blue-800' };
    if (scopeConfig.tipo_alcance === 'cetap') return { label: `CETAP (${scopeConfig.cetaps.length})`, color: 'bg-purple-100 text-purple-800' };
    if (scopeConfig.tipo_alcance === 'programa') return { label: `Programa (${scopeConfig.programas.length})`, color: 'bg-orange-100 text-orange-800' };
    return { label: 'Personalizado', color: 'bg-yellow-100 text-yellow-800' };
  }, [isGlobal, scopeConfig]);

  return {
    scopeConfig,
    isLoading,
    error,
    isGlobal,
    filterByTerritorial,
    filterByCetap,
    filterByPrograma,
    applyAllFilters,
    scopeBadge,
    reload: loadScope
  };
}