import { describe, expect, it } from 'vitest';

function filterCetapsForTerritorial(rawCetaps: any[], territorialNombreOrId: string) {
  if (!Array.isArray(rawCetaps) || rawCetaps.length === 0) return [];
  const norm = String(territorialNombreOrId || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const isSedeCentral = norm === 'sede central' || norm.includes('sede central') || norm === 'sc' || norm === '1' || norm === 'sede-central';

  if (isSedeCentral) {
    const scOnly = rawCetaps.filter((c: any) => {
      const cNorm = String(c?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return cNorm === 'sede central' || (cNorm.includes('sede central') && !cNorm.includes('otro') && !cNorm.includes('principal'));
    });
    return scOnly.length > 0 ? scOnly : rawCetaps.filter((c: any) => !String(c?.nombre || '').toUpperCase().includes('OTRO'));
  }
  return rawCetaps;
}

describe('PTA CETAP Selection under Sede Central', () => {
  it('filtra y deja únicamente la CETAP "Sede Central", descartando "CETAP Sede Principal" y "OTRO"', () => {
    const mockBackendCetaps = [
      { id: '1', nombre: 'CETAP Sede Principal' },
      { id: '2', nombre: 'OTRO' },
      { id: '3', nombre: 'Sede Central' },
    ];

    const result = filterCetapsForTerritorial(mockBackendCetaps, 'Sede Central');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: '3', nombre: 'Sede Central' });
  });

  it('no afecta otras territoriales como Antioquia', () => {
    const mockAntioquiaCetaps = [
      { id: '10', nombre: 'CETAP Medellín' },
      { id: '11', nombre: 'CETAP Apartadó' },
      { id: '12', nombre: 'CETAP Caucasia' },
    ];

    const result = filterCetapsForTerritorial(mockAntioquiaCetaps, 'Antioquia');
    expect(result).toHaveLength(3);
  });
});
