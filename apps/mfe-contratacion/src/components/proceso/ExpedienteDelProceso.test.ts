import { describe, expect, it } from 'vitest';
import { agruparExpediente } from './ExpedienteDelProceso';
import { DocumentoExpediente } from '../../types';

const doc = (parcial: Partial<DocumentoExpediente>): DocumentoExpediente => ({
  id: parcial.nombre ?? 'x',
  tipo: 'ADJUNTO',
  nombre: 'x',
  hashSha256: 'h',
  version: 1,
  createdAt: '2026-10-01T00:00:00Z',
  ...parcial,
});

const actividades = [
  { numeral: '3.1', nombre: 'Estudio previo', etapa: 3 },
  { numeral: '4.2', nombre: 'Expedición del CDP', etapa: 4 },
];

describe('agruparExpediente', () => {
  it('ordena por etapa y actividad, y separa registro, lista de chequeo y adjuntos', () => {
    const etapas = agruparExpediente(
      [
        doc({ nombre: 'cdp.pdf', numeral: '4.2' }),
        doc({ nombre: 'Estudio previo v1', numeral: '3.1', tipo: 'SNAPSHOT_FORMULARIO' }),
        doc({ nombre: 'memorando.pdf', numeral: '3.1', requisito: 'MEMO', requisitoNombre: 'Memorando de solicitud' }),
        doc({ nombre: 'anexo.pdf', numeral: '3.1' }),
      ],
      actividades,
    );

    expect(etapas.map((e) => [e.numero, e.nombre, e.total])).toEqual([
      [3, 'Estudios Previos', 3],
      [4, 'CDP', 1],
    ]);
    const estudio = etapas[0].actividades[0];
    expect(estudio.nombre).toBe('Estudio previo');
    expect(estudio.registros.map((d) => d.nombre)).toEqual(['Estudio previo v1']);
    expect(estudio.requisitos).toEqual([
      expect.objectContaining({ nombre: 'Memorando de solicitud' }),
    ]);
    expect(estudio.adjuntos.map((d) => d.nombre)).toEqual(['anexo.pdf']);
  });

  it('pone el archivo vigente del requisito antes que el sustituido', () => {
    const [etapa] = agruparExpediente(
      [
        doc({ nombre: 'viejo.pdf', numeral: '3.1', requisito: 'MEMO', sustituido: true }),
        doc({ nombre: 'nuevo.pdf', numeral: '3.1', requisito: 'MEMO' }),
      ],
      actividades,
    );
    expect(etapa.actividades[0].requisitos[0].documentos.map((d) => d.nombre)).toEqual([
      'nuevo.pdf',
      'viejo.pdf',
    ]);
  });

  it('no pierde lo que llega sin actividad o fuera del catálogo', () => {
    const etapas = agruparExpediente(
      [doc({ nombre: 'suelto.pdf' }), doc({ nombre: 'raro.pdf', numeral: '9.9' })],
      actividades,
    );
    expect(etapas.map((e) => e.numero)).toEqual([9, null]);
    expect(etapas[0].actividades[0].nombre).toBe('Actividad 9.9');
    expect(etapas[1].actividades[0].nombre).toBe('Sin actividad asociada');
  });
});
