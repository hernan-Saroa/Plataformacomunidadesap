import { describe, expect, it } from 'vitest';

import { ORDEN_PETICIONES, PETICIONES, peticionDe } from './peticiones';

/**
 * Qué puede pedir una actividad, y qué dejó de ofrecerse (EFDS-1183).
 *
 * Lo que se retira de la lista no se borra del catálogo: son dos cosas
 * distintas, y confundirlas dejaría ilegibles los campos ya guardados.
 */
describe('peticiones · lo que se ofrece al configurar', () => {
  it('no ofrece adjuntar un documento: eso lo pide el formato', () => {
    // Abría un selector genérico —«Documento firmado»— mientras la biblioteca
    // pide el mismo papel diciendo de cuál se trata y prestando la plantilla.
    // Eran dos casillas para un solo documento.
    expect(ORDEN_PETICIONES).not.toContain('ADJUNTAR_DOCUMENTO');
  });

  it('tampoco la aprobación, que la resuelve su propia pestaña', () => {
    expect(ORDEN_PETICIONES).not.toContain('APROBACION_RESPONSABLE');
  });

  it('sigue ofreciendo las tres formas de cerrar una actividad', () => {
    expect(ORDEN_PETICIONES).toEqual([
      'ESCRIBIR_JUSTIFICACION',
      'REGISTRAR_FECHA',
      'MARCAR_CASILLA',
    ]);
  });

  it('conserva la definición de lo retirado, para leer lo ya guardado', () => {
    // Sin esto, un campo de archivo configurado antes se leería como «escribir
    // una justificación», que es lo que devuelve `peticionDe` sin coincidencia.
    expect(PETICIONES.ADJUNTAR_DOCUMENTO.tipo).toBe('archivo');
    expect(peticionDe('archivo')).toBe('ADJUNTAR_DOCUMENTO');
  });

  it('cada petición ofrecida sabe con qué tipo se guarda', () => {
    for (const p of ORDEN_PETICIONES) {
      expect(PETICIONES[p].tipo).toBeTruthy();
      expect(PETICIONES[p].nombre).toBeTruthy();
    }
  });
});
