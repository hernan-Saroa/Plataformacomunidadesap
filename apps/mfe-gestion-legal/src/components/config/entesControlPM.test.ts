import { describe, it, expect } from 'vitest';
import {
  textoEstadoGuardado, contarPlanesDeEnte, resolverEnteControl, colorFondoSuave, agruparPlanesPorEnte,
  generarIdEnteControlPM, validarEntesControlPM,
} from './entesControlPM';
import type { EnteControlPM } from './ConfiguracionesSIGLContext';

const ente = (id: string, nombre: string, activo = true): EnteControlPM => ({
  id, nombre, descripcion: '', icono: '🏛️', color: '#DC2626', activo,
});

describe('entesControlPM utils', () => {
  it('textoEstadoGuardado cubre los cuatro estados', () => {
    expect(textoEstadoGuardado('saving')).toBe('Guardando…');
    expect(textoEstadoGuardado('saved')).toBe('Cambios guardados');
    expect(textoEstadoGuardado('error')).toBe('Error al guardar');
    expect(textoEstadoGuardado('idle')).toContain('Guardado automático activo');
  });

  it('contarPlanesDeEnte cuenta por origen (0, 1 y varios)', () => {
    const planes = [{ origen: 'A' }, { origen: 'B' }, { origen: 'A' }, { origen: null }, {}];
    expect(contarPlanesDeEnte([], 'A')).toBe(0);
    expect(contarPlanesDeEnte(planes, 'B')).toBe(1);
    expect(contarPlanesDeEnte(planes, 'A')).toBe(2);
    expect(contarPlanesDeEnte(planes, 'Z')).toBe(0);
  });

  it('resolverEnteControl usa la configuración vigente, incluso para entes inactivos', () => {
    const entes = [ente('A', 'Nombre actualizado'), ente('B', 'Inactivo', false)];
    expect(resolverEnteControl(entes, 'A')).toMatchObject({ nombre: 'Nombre actualizado', activo: true });
    expect(resolverEnteControl(entes, 'B')).toMatchObject({ nombre: 'Inactivo', activo: false });
  });

  it('resolverEnteControl con un ente que ya no existe (o vacío) cae a un valor neutro', () => {
    expect(resolverEnteControl([], 'OTRO')).toMatchObject({ nombre: 'OTRO', color: '#6B7280' });
    expect(resolverEnteControl([], '').nombre).toBe('Sin ente');
  });

  it('colorFondoSuave agrega transparencia a #RRGGBB y usa gris si el color es inválido', () => {
    expect(colorFondoSuave('#DC2626')).toBe('#DC26261A');
    expect(colorFondoSuave('rojo')).toBe('#F3F4F6');
    expect(colorFondoSuave('#FFF')).toBe('#F3F4F6');
  });

  it('agruparPlanesPorEnte: activos primero (aun sin planes) y conserva planes de entes inactivos o inexistentes', () => {
    const entes = [ente('A', 'A'), ente('B', 'B', false), ente('C', 'C')];
    const planes = [
      { id: 1, enteControl: 'A' }, { id: 2, enteControl: 'B' }, { id: 3, enteControl: 'LEGADO' },
    ];
    const g = agruparPlanesPorEnte(planes, entes);
    expect(Object.keys(g)).toEqual(['A', 'C', 'B', 'LEGADO']);
    expect(g.C).toEqual([]);
    expect(g.B).toHaveLength(1);
    expect(g.LEGADO).toHaveLength(1);
  });

  it('generarIdEnteControlPM evita colisiones cuando ya existe el id con el mismo timestamp', () => {
    const existentes = [{ id: 'ente-1000' }, { id: 'ente-1000-1' }];
    expect(generarIdEnteControlPM([], 1000)).toBe('ente-1000');
    expect(generarIdEnteControlPM(existentes, 1000)).toBe('ente-1000-2');
  });

  it('validarEntesControlPM rechaza nombres vacíos o ids repetidos y acepta listas válidas', () => {
    expect(validarEntesControlPM([ente('A', 'Contraloría')])).toBeNull();
    expect(validarEntesControlPM([ente('A', '   ')])).toContain('nombre');
    expect(validarEntesControlPM([ente('A', 'Uno'), ente('A', 'Dos')])).toContain('repetido');
  });
});
