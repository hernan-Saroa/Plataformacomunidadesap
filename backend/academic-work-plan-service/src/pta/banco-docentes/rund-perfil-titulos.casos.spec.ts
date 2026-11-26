import { clasificarTitulosDePerfil, deducirTitulosAdicionales, separarTitulosDePerfil } from './rund-perfil-titulos';

/** RUND-003 — casos de redacción reales y límite del clasificador de PERFIL_ACADEMICO. */
const nivel = (perfil: unknown) => clasificarTitulosDePerfil(perfil);

describe('Perfil académico · estudios que no están terminados', () => {
  it.each([
    'Candidato a Doctor en Educación',
    'Candidata a Doctora en Estudios Políticos',
    'Estudiante de Maestría en Gobierno',
    'Cursando Doctorado en Ciencias Sociales',
    'Doctorando en Filosofía',
    'Aspirante a Magíster en Derecho',
    'Magíster (c) en Educación',
    'Doctor (c) en Ciencia Política',
    'Egresado de Maestría en Gestión Pública',
  ])('"%s" no se registra como título: queda sin clasificar', (texto) => {
    const r = nivel(`Abogado, ${texto}`);
    expect(r.porNivel).toEqual({ pregrado: ['Abogado'] });
    expect(r.sinClasificar).toHaveLength(1);
  });

  it('un título terminado junto a uno en curso: solo el terminado cuenta', () => {
    const r = nivel('Magíster en Derecho Público, Candidato a Magíster en Derecho Privado');
    expect(r.porNivel).toEqual({ maestria: ['Magíster en Derecho Público'] });
    expect(r.sinClasificar).toEqual(['Candidato a Magíster en Derecho Privado']);
  });
});

describe('Perfil académico · abreviaturas', () => {
  it.each([
    ['Dr. en Ciencias Políticas', 'doctorado'],
    ['Dra. en Filosofía', 'doctorado'],
    ['PhD en Economía', 'doctorado'],
    ['Mg. en Gobierno', 'maestria'],
    ['MSc en Ingeniería', 'maestria'],
    ['MBA', 'maestria'],
    ['Esp. en Gerencia de Proyectos', 'especializacion'],
    ['Ing. Industrial', 'pregrado'],
    ['Lic. en Educación', 'pregrado'],
    ['Post-Doctorado en Ciencias Sociales', 'posDoctorado'],
    ['Postdoctoral en Política Pública', 'posDoctorado'],
    ['MAGISTER EN DERECHO', 'maestria'],
    ['especialista en gerencia', 'especializacion'],
  ])('"%s" → %s', (texto, esperado) => {
    expect(Object.keys(nivel(texto).porNivel)).toEqual([esperado]);
  });
});

describe('Perfil académico · texto que acompaña a los títulos', () => {
  it('no trata como título las instituciones, los años ni el "sin dato"', () => {
    const r = nivel('Abogado, Universidad Nacional de Colombia, 2010, Magíster en Derecho, Universidad de los Andes, N/A, Ninguno, -');
    expect(r.porNivel).toEqual({ pregrado: ['Abogado'], maestria: ['Magíster en Derecho'] });
    expect(r.sinClasificar).toEqual([]);
  });
  it('ignora lo que va entre paréntesis (institución y año) sin partir el título por sus comas', () => {
    const r = nivel('Abogado (Universidad Libre, 2010), Magíster en Gobierno (Universidad Externado, 2015)');
    expect(r.porNivel).toEqual({ pregrado: ['Abogado'], maestria: ['Magíster en Gobierno'] });
    expect(r.sinClasificar).toEqual([]);
  });
  it('lee viñetas y numeración', () => {
    expect(nivel('1. Abogado\n2. Magíster en Derecho\n3) Doctor en Ciencias').porNivel)
      .toEqual({ pregrado: ['Abogado'], maestria: ['Magíster en Derecho'], doctorado: ['Doctor en Ciencias'] });
    expect(nivel('• Abogado • Economista\n- Magíster en Derecho').porNivel)
      .toEqual({ pregrado: ['Abogado', 'Economista'], maestria: ['Magíster en Derecho'] });
  });
  it('tolera mayúsculas, minúsculas, espacios y saltos de línea sobrantes', () => {
    expect(nivel('  ABOGADO ,\n\n   magíster   en   derecho  ;  ').porNivel).toEqual({ pregrado: ['ABOGADO'], maestria: ['magíster en derecho'] });
  });
});

describe('Perfil académico · varias profesiones en un mismo texto', () => {
  it('parte "A y B" solo cuando cada parte es una profesión', () => {
    expect(nivel('Abogado y Economista').porNivel.pregrado).toEqual(['Abogado', 'Economista']);
    expect(nivel('Contador Público y Administrador de Empresas').porNivel.pregrado).toEqual(['Contador Público', 'Administrador de Empresas']);
    expect(nivel('Politólogo/Abogado').porNivel.pregrado).toEqual(['Politólogo', 'Abogado']);
  });
  it('no parte un título cuyo "y" es parte del nombre', () => {
    expect(nivel('Magíster en Gobierno y Políticas Públicas').porNivel.maestria).toEqual(['Magíster en Gobierno y Políticas Públicas']);
    expect(nivel('Doctor en Ciencias Sociales y Humanas').porNivel.doctorado).toEqual(['Doctor en Ciencias Sociales y Humanas']);
    expect(nivel('Licenciado en Ciencias Sociales y Economía').porNivel.pregrado).toEqual(['Licenciado en Ciencias Sociales y Economía']);
    expect(nivel('Administración Pública y de Empresas').porNivel.pregrado).toEqual(['Administración Pública y de Empresas']);
  });
  it('une el texto que sigue a una coma interna del título solo cuando es inequívoco (conector o minúscula)', () => {
    expect(separarTitulosDePerfil('Abogado, Magíster en Gobierno, de las Organizaciones')).toEqual(['Abogado', 'Magíster en Gobierno, de las Organizaciones']);
  });
  it('si no es inequívoco (empieza con mayúscula) no adivina: queda como texto sin clasificar y no se pierde', () => {
    const r = nivel('Abogado, Magíster en Psicoanálisis, Subjetividad y Cultura');
    expect(r.porNivel.maestria).toEqual(['Magíster en Psicoanálisis']);
    expect(r.sinClasificar).toEqual(['Subjetividad y Cultura']);
  });
});

describe('Perfil académico · entradas raras', () => {
  it.each([[null], [undefined], [''], ['   '], [',,,;;'], [false], [[]]])('%p no rompe ni inventa títulos', (valor) => {
    const r = nivel(valor);
    expect(Object.keys(r.porNivel)).toHaveLength(0);
    expect(r.sinClasificar.every(texto => typeof texto === 'string')).toBe(true);
  });
  it('un número o una fecha en la celda llega como texto sin romper', () => {
    expect(() => nivel(20240131)).not.toThrow();
    expect(() => nivel(new Date())).not.toThrow();
  });
  it('un texto larguísimo se procesa sin colgarse', () => {
    const largo = Array.from({ length: 2000 }, (_, i) => `Magíster en Tema ${i}`).join(', ');
    const inicio = Date.now();
    expect(nivel(largo).porNivel.maestria).toHaveLength(2000);
    expect(Date.now() - inicio).toBeLessThan(3000);
  });
});

describe('Deducción · topes y lo ya registrado', () => {
  it('no guarda más de 10 adicionales por nivel: el resto se informa como sin clasificar', () => {
    const perfil = Array.from({ length: 13 }, (_, i) => `Especialista en Área ${i + 1}`).join(', ');
    const r = deducirTitulosAdicionales(perfil, { pregrado: 'Abogado' });
    expect(r.adicionales.especializacion).toHaveLength(10);
    expect(r.deducidos).toBe(10);
    expect(r.sinClasificar).toHaveLength(3);
    expect(r.reconocidos).toBe(13);
  });
  it('descuenta del tope lo que el nivel ya tiene', () => {
    const previos = { especializacion: Array.from({ length: 9 }, (_, i) => `Especialista en Previo ${i + 1}`) };
    const r = deducirTitulosAdicionales('Especialista en Nuevo Uno, Especialista en Nuevo Dos', {}, previos);
    expect(r.adicionales.especializacion).toHaveLength(10);
    expect(r.deducidos).toBe(1);
    expect(r.sinClasificar).toEqual(['Especialista en Nuevo Dos']);
  });
  it('un título de más de 300 caracteres no se guarda como adicional', () => {
    const largo = `Magíster en ${'Gobierno '.repeat(60)}`.trim();
    const r = deducirTitulosAdicionales(`Abogado, ${largo}`, { pregrado: 'Abogado' });
    expect(r.adicionales.maestria).toBeUndefined();
    expect(r.sinClasificar).toEqual([largo]);
  });
  it('perfil sin títulos reconocibles: 0 reconocidos y sin cambios', () => {
    const r = deducirTitulosAdicionales('Docente con experiencia', { pregrado: 'Abogado' });
    expect(r.reconocidos).toBe(0);
    expect(r.deducidos).toBe(0);
    expect(r.adicionales).toEqual({});
  });
  it('perfil vacío no borra los adicionales ya registrados', () => {
    const r = deducirTitulosAdicionales('', { pregrado: 'Abogado' }, { pregrado: ['Historiador'] });
    expect(r.adicionales).toEqual({ pregrado: ['Historiador'] });
    expect(r.deducidos).toBe(0);
  });
});
