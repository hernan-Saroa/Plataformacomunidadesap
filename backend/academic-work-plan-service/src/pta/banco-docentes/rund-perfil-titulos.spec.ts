import { clasificarTitulosDePerfil, deducirTitulosAdicionales, mismoTitulo, separarTitulosDePerfil } from './rund-perfil-titulos';

// Celdas reales de PERFIL_ACADEMICO de la plantilla de cargue (CargaDocentes_RUND_2025-1).
const PERFILES = {
  paz: 'Administrador Publico, Especialista en Proyectos de Desarrollo, Magister en Paz Desarrollo y Ciudadanía.',
  sociologia: 'Administrador Público, Magister en Sociología, Doctor en Gobierno y Administración Pública.',
  politica: 'Abogado, Magíster en Ciencia Política, Doctor en Ciencia Política',
  economia: 'Economista, Magister en Economía',
  fisica: 'Físico, Doctorado en Ciencias - Física.',
  historiador: 'Abogado, Historiador, Posgrado en Cultura de la Paz, Magíster en Derecho de las Administraciones Públicas',
  pegado: 'Abogado, Especialista en Gestión PúblicaDoctor en Ciencias Politicas',
  politologa: 'Politóloga , Magister en Estudios Políticos, Doctora en Filosofía.',
  ingeniero: 'Ingeniero Industrial, Especialista en Gerencia de Proyectos, Especialista en Seguridad y Salud en el Trabajo, Magister en Gerencia',
  artes: 'Abogado, Licenciado en Artes Visuales, Magíster en Defensa de los Derechos Humanos y del Derecho Internacional Humanitario',
};

describe('RUND-003 · títulos deducidos de PERFIL_ACADEMICO', () => {
  it('clasifica por nivel las celdas reales de la plantilla', () => {
    expect(clasificarTitulosDePerfil(PERFILES.paz).porNivel).toEqual({
      pregrado: ['Administrador Publico'], especializacion: ['Especialista en Proyectos de Desarrollo'], maestria: ['Magister en Paz Desarrollo y Ciudadanía'],
    });
    expect(clasificarTitulosDePerfil(PERFILES.politica).porNivel).toEqual({ pregrado: ['Abogado'], maestria: ['Magíster en Ciencia Política'], doctorado: ['Doctor en Ciencia Política'] });
    expect(clasificarTitulosDePerfil(PERFILES.fisica).porNivel).toEqual({ pregrado: ['Físico'], doctorado: ['Doctorado en Ciencias - Física'] });
    expect(clasificarTitulosDePerfil(PERFILES.politologa).porNivel).toEqual({ pregrado: ['Politóloga'], maestria: ['Magister en Estudios Políticos'], doctorado: ['Doctora en Filosofía'] });
  });

  it('un docente puede tener varios títulos en el mismo nivel', () => {
    const { porNivel } = clasificarTitulosDePerfil(PERFILES.ingeniero);
    expect(porNivel.especializacion).toEqual(['Especialista en Gerencia de Proyectos', 'Especialista en Seguridad y Salud en el Trabajo']);
    expect(clasificarTitulosDePerfil(PERFILES.historiador).porNivel.pregrado).toEqual(['Abogado', 'Historiador']);
    expect(clasificarTitulosDePerfil(PERFILES.artes).porNivel.pregrado).toEqual(['Abogado', 'Licenciado en Artes Visuales']);
  });

  it('no adivina: "Posgrado" y lo desconocido quedan sin clasificar', () => {
    const r = clasificarTitulosDePerfil(PERFILES.historiador);
    expect(r.sinClasificar).toEqual(['Posgrado en Cultura de la Paz']);
    expect(r.porNivel.maestria).toEqual(['Magíster en Derecho de las Administraciones Públicas']);
    expect(clasificarTitulosDePerfil('Perfil con experiencia en gestión').sinClasificar).toEqual(['Perfil con experiencia en gestión']);
  });

  it('separa títulos pegados sin coma y quita puntos finales y conectores', () => {
    expect(separarTitulosDePerfil(PERFILES.pegado)).toEqual(['Abogado', 'Especialista en Gestión Pública', 'Doctor en Ciencias Politicas']);
    expect(separarTitulosDePerfil('Abogado, y Magíster en Derecho.')).toEqual(['Abogado', 'Magíster en Derecho']);
  });

  it('une la continuación de un título que lleva coma interna', () => {
    expect(separarTitulosDePerfil('Abogado, Magíster en Gobierno, de las Organizaciones')).toEqual(['Abogado', 'Magíster en Gobierno, de las Organizaciones']);
  });

  it('tolera vacíos y valores no textuales', () => {
    expect(clasificarTitulosDePerfil(null)).toEqual({ porNivel: {}, sinClasificar: [] });
    expect(clasificarTitulosDePerfil('  ,  ; ')).toEqual({ porNivel: {}, sinClasificar: [] });
    expect(clasificarTitulosDePerfil(12345).sinClasificar).toEqual(['12345']);
  });

  describe('mismoTitulo', () => {
    it('reconoce el mismo título aunque cambie género o forma', () => {
      expect(mismoTitulo('Administracion Pública', 'Administrador Publico')).toBe(true);
      expect(mismoTitulo('Magister en Economía', 'Magíster en Economia.')).toBe(true);
    });
    it('no confunde títulos distintos', () => {
      expect(mismoTitulo('Magíster en Derecho', 'Magíster en Derechos Humanos')).toBe(false);
      expect(mismoTitulo('Abogado', 'Economista')).toBe(false);
    });
  });

  describe('deducirTitulosAdicionales', () => {
    it('el título de la plantilla es el precargado y el resto del nivel es adicional', () => {
      const r = deducirTitulosAdicionales(PERFILES.historiador, { pregrado: 'Abogado', maestria: 'Magister en Derecho de las Administraciones Publicas' });
      expect(r.adicionales).toEqual({ pregrado: ['Historiador'] });
      expect(r.deducidos).toBe(1);
      expect(r.sinClasificar).toEqual(['Posgrado en Cultura de la Paz']);
    });
    it('no repite como adicional el título precargado con distinta forma (Administración ↔ Administrador)', () => {
      const r = deducirTitulosAdicionales(PERFILES.sociologia, { pregrado: 'Administracion Pública', maestria: 'Magister en Sociologia', doctorado: 'Doctor en Gobierno y Administracion Publica' });
      expect(r.adicionales).toEqual({});
      expect(r.deducidos).toBe(0);
    });
    it('si el nivel no trae título precargado, todos los del perfil son adicionales', () => {
      expect(deducirTitulosAdicionales(PERFILES.economia, { pregrado: 'Economista' }).adicionales).toEqual({ maestria: ['Magister en Economía'] });
    });
    it('une con lo ya registrado y no pisa títulos agregados a mano', () => {
      const r = deducirTitulosAdicionales(PERFILES.politica, { pregrado: 'Abogado' }, { pregrado: ['Politólogo'], maestria: ['Magíster en Ciencia Política'] });
      expect(r.adicionales).toEqual({ pregrado: ['Politólogo'], maestria: ['Magíster en Ciencia Política'], doctorado: ['Doctor en Ciencia Política'] });
      expect(r.deducidos).toBe(1);
    });
    it('es idempotente: cargar dos veces la misma fila no duplica', () => {
      const primera = deducirTitulosAdicionales(PERFILES.ingeniero, { pregrado: 'Ingeniero Industrial' });
      const segunda = deducirTitulosAdicionales(PERFILES.ingeniero, { pregrado: 'Ingeniero Industrial' }, primera.adicionales);
      expect(segunda.adicionales).toEqual(primera.adicionales);
      expect(segunda.deducidos).toBe(0);
    });
  });
});
