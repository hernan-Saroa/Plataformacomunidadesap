/**
 * Configuracion geoespacial de territoriales ESAP.
 * La relacion departamento -> territorial es aproximada y se usa solo para visualizacion del mapa.
 */

import { OFFICIAL_TERRITORIALES_ESAP } from '../../../shared/territoriales-cetaps-esap';

export interface TerritorialESAP {
  id: string;
  nombre: string;
  ciudad: string;
  departamentos: string[];
}

function normalizeDept(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function buildDepartmentVariants(departamento: string): string[] {
  const upper = normalizeDept(departamento);
  const variants = new Set<string>([upper]);

  if (upper === 'BOGOTA D.C.') {
    variants.add('BOGOTA, D.C.');
    variants.add('SANTAFE DE BOGOTA D.C');
  }

  if (upper === 'ARCHIPIELAGO DE SAN ANDRES, PROVIDENCIA Y SANTA CATALINA') {
    variants.add('SAN ANDRES Y PROVIDENCIA');
    variants.add('SAN ANDRES');
  }

  return [...variants];
}

export const TERRITORIALES_ESAP: TerritorialESAP[] = OFFICIAL_TERRITORIALES_ESAP.map((territorial) => ({
  id: territorial.id,
  nombre: territorial.nombre,
  ciudad: territorial.ciudadPrincipal,
  departamentos: territorial.departamentos.flatMap((departamento) => buildDepartmentVariants(departamento)),
}));

export function getDeptTerritorialId(deptName: string): string | undefined {
  if (!deptName) return undefined;
  const normalizedInput = normalizeDept(deptName);

  for (const territorial of TERRITORIALES_ESAP) {
    if (territorial.departamentos.some((departamento) => departamento === normalizedInput)) {
      return territorial.id;
    }
  }

  const firstWord = normalizedInput.split(/[\s,]+/).find((word) => word.length > 3);
  if (!firstWord) return undefined;

  for (const territorial of TERRITORIALES_ESAP) {
    if (territorial.departamentos.some((departamento) => departamento.split(/[\s,]+/).includes(firstWord))) {
      return territorial.id;
    }
  }

  return undefined;
}

const COLOR_PALETTE = [
  { base: '#2563EB', hover: '#1D4ED8', light: '#DBEAFE', dark: '#1E3A8A' },
  { base: '#059669', hover: '#047857', light: '#D1FAE5', dark: '#064E3B' },
  { base: '#7C3AED', hover: '#6D28D9', light: '#EDE9FE', dark: '#4C1D95' },
  { base: '#DC2626', hover: '#B91C1C', light: '#FEE2E2', dark: '#7F1D1D' },
  { base: '#D97706', hover: '#B45309', light: '#FEF3C7', dark: '#78350F' },
  { base: '#0891B2', hover: '#0E7490', light: '#CFFAFE', dark: '#155E75' },
  { base: '#16A34A', hover: '#15803D', light: '#DCFCE7', dark: '#14532D' },
  { base: '#9333EA', hover: '#7E22CE', light: '#F3E8FF', dark: '#581C87' },
  { base: '#EA580C', hover: '#C2410C', light: '#FFEDD5', dark: '#7C2D12' },
  { base: '#0284C7', hover: '#0369A1', light: '#E0F2FE', dark: '#0C4A6E' },
  { base: '#65A30D', hover: '#4D7C0F', light: '#ECFCCB', dark: '#365314' },
  { base: '#DB2777', hover: '#BE185D', light: '#FCE7F3', dark: '#831843' },
  { base: '#4F46E5', hover: '#4338CA', light: '#E0E7FF', dark: '#312E81' },
  { base: '#CA8A04', hover: '#A16207', light: '#FEF9C3', dark: '#713F12' },
  { base: '#0D9488', hover: '#0F766E', light: '#CCFBF1', dark: '#134E4A' },
  { base: '#E11D48', hover: '#BE123C', light: '#FFE4E6', dark: '#881337' },
  { base: '#92400E', hover: '#78350F', light: '#FDE68A', dark: '#451A03' },
];

export const TERRITORIAL_COLORS = Object.fromEntries(
  TERRITORIALES_ESAP.map((territorial, index) => [territorial.id, COLOR_PALETTE[index % COLOR_PALETTE.length]]),
) as Record<string, { base: string; hover: string; light: string; dark: string }>;
