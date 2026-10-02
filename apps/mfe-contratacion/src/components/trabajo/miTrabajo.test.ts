import { describe, expect, it } from 'vitest';

import { ProcesoResumen } from '../../types';
import { Situacion } from '../proceso/situacionDelProceso';
import { clasificarMiTrabajo } from './miTrabajo';

const proceso = (id: string, cambios: Partial<ProcesoResumen> = {}): ProcesoResumen => ({
  id,
  radicado: `CTO-${id}`,
  objeto: 'Objeto',
  etapa: 3,
  fechaRadicacion: '2026-09-01',
  ...cambios,
});

const situacion = (cambios: Partial<Situacion>): Situacion => ({
  momento: 'tramite',
  numeral: '4.1',
  titulo: 'Solicitud de CDP',
  etapa: 4,
  quien: 'Gestor',
  teToca: false,
  espera: null,
  ultimoMovimiento: '2026-09-20',
  ...cambios,
});

describe('Mi trabajo · cada proceso en su pestaña', () => {
  it('lo que me toca trabajar va a Por hacer, y el reparto a Por asignar', () => {
    const t = clasificarMiTrabajo([
      { proceso: proceso('a'), situacion: situacion({ teToca: true }) },
      { proceso: proceso('b'), situacion: situacion({ teToca: true, momento: 'asignacion' }) },
      { proceso: proceso('c'), situacion: situacion({ teToca: true, momento: 'redaccion' }) },
    ]);

    expect(t.porHacer.map((e) => e.proceso.id)).toEqual(['a', 'c']);
    expect(t.porAsignar.map((e) => e.proceso.id)).toEqual(['b']);
  });

  it('lo que reviso no se repite aquí: tiene su propia pestaña', () => {
    const t = clasificarMiTrabajo([
      { proceso: proceso('a'), situacion: situacion({ teToca: true, momento: 'revision' }) },
    ]);

    expect(t.porHacer).toEqual([]);
    expect(t.porAsignar).toEqual([]);
  });

  it('en espera solo lo mío: lo que radiqué o donde tengo un papel', () => {
    const t = clasificarMiTrabajo([
      { proceso: proceso('mio', { radicadoPorMi: true }), situacion: situacion({}) },
      {
        proceso: proceso('abogado', {
          participacion: {
            contratacion: null,
            abogado: { nombre: 'Yo', usuarioNombre: 'yo', esMio: true },
            enBandeja: false,
          },
        }),
        situacion: situacion({}),
      },
      { proceso: proceso('ajeno'), situacion: situacion({}) },
    ]);

    expect(t.enEspera.map((e) => e.proceso.id)).toEqual(['mio', 'abogado']);
  });

  it('lo terminado o negado no le pide nada a nadie', () => {
    const t = clasificarMiTrabajo([
      { proceso: proceso('a', { radicadoPorMi: true }), situacion: situacion({ momento: 'terminado' }) },
      { proceso: proceso('b', { radicadoPorMi: true }), situacion: situacion({ momento: 'negado' }) },
    ]);

    expect(t).toEqual({ porHacer: [], porAsignar: [], enEspera: [] });
  });

  it('lo más quieto primero', () => {
    const t = clasificarMiTrabajo([
      { proceso: proceso('nuevo'), situacion: situacion({ teToca: true, ultimoMovimiento: '2026-09-25' }) },
      { proceso: proceso('viejo'), situacion: situacion({ teToca: true, ultimoMovimiento: '2026-09-02' }) },
    ]);

    expect(t.porHacer.map((e) => e.proceso.id)).toEqual(['viejo', 'nuevo']);
  });
});
