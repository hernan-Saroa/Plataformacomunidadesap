import { describe, expect, it } from 'vitest';
import { isEvidenciaAuthorized, type PTAComponentKey } from './ptaComponentPermissions';

const autorizador = (...componentes: PTAComponentKey[]) => {
  const permitidos = new Set(componentes);
  return (key: PTAComponentKey) => permitidos.has(key);
};

describe('isEvidenciaAuthorized', () => {
  it('Docencia Pregrado ve Docencia, pero no Investigación', () => {
    const puede = autorizador('academica_pregrado');
    expect(isEvidenciaAuthorized({ componente_pta: 'docencia' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'investigacion' }, puede)).toBe(false);
  });

  it('Investigación ve exclusivamente sus evidencias', () => {
    const puede = autorizador('investigacion');
    expect(isEvidenciaAuthorized({ componente_pta: 'investigacion' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'docencia' }, puede)).toBe(false);
  });

  it('Extensión Capacitación no puede gestionar otra sección de Extensión', () => {
    const puede = autorizador('ext_capacitacion');
    expect(isEvidenciaAuthorized({ componente_pta: 'extension', seccion_extension: 'capacitacion' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'extension', seccion_extension: 'alto_gobierno' }, puede)).toBe(false);
    expect(isEvidenciaAuthorized({ componente_pta: 'extension', seccion_extension: 'desconocida' }, puede)).toBe(false);
  });

  it('mantiene compatibles las evidencias históricas de Extensión sin sección', () => {
    expect(isEvidenciaAuthorized(
      { componente_pta: 'extension' },
      autorizador('ext_capacitacion'),
    )).toBe(true);
  });

  it('cualquier permiso especializado de Complementarias reconoce su evidencia agrupada', () => {
    const puede = autorizador('complementarias_pregrado');
    expect(isEvidenciaAuthorized({ componente_pta: 'complementarias' }, puede)).toBe(true);
  });

  it('un aprobador integral puede gestionar cualquier evidencia reconocida', () => {
    const puede = (_key: PTAComponentKey) => true;
    expect(isEvidenciaAuthorized({ componente_pta: 'docencia' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'investigacion' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'extension', seccion_extension: 'alto_gobierno' }, puede)).toBe(true);
    expect(isEvidenciaAuthorized({ componente_pta: 'complementarias' }, puede)).toBe(true);
  });
});
