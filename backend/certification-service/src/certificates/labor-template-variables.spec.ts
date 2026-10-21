import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { Certificate } from './certificate.entity';
import {
  canonicalizeTemplateVariables,
  prepareTemplateVariables,
} from './labor-template-variables';

describe('variables de plantilla pegadas o mal escritas', () => {
  describe('canonicalizeTemplateVariables', () => {
    it.each([
      ['[cargo]', '[CARGO]'],
      ['[ CARGO ]', '[CARGO]'],
      ['[Nombre_Empleado]', '[NOMBRE_EMPLEADO]'],
      ['[NOMBRE EMPLEADO]', '[NOMBRE_EMPLEADO]'],
      ['[CARGO&nbsp;]', '[CARGO]'],
      ['[ubicación]', '[UBICACION]'],
      ['[CARGO DATO6]', '[CARGO DATO6]'],
      ['[funciones]', '[FUNCIONES]'],
    ])('reconoce %s como %s', (input, expected) => {
      expect(canonicalizeTemplateVariables(input)).toBe(expected);
    });

    it('une una variable partida por etiquetas sin desbalancear el HTML', () => {
      expect(canonicalizeTemplateVariables('<b>[CAR</b>GO]')).toBe('<b>[CARGO]</b>');
      expect(canonicalizeTemplateVariables('[<span class="x">CARGO</span>]')).toBe('[CARGO]<span class="x"></span>');
    });

    it('no toca corchetes que no son variables conocidas', () => {
      const html = '<p>Ver [nota al pie] y [CARG0] y [ ]</p>';
      expect(canonicalizeTemplateVariables(html)).toBe(html);
    });

    it('conserva el HTML del editor (span del token) tal cual', () => {
      const html = '<span class="variable-token bg-yellow-200" contenteditable="false">[CARGO]</span>';
      expect(canonicalizeTemplateVariables(html)).toBe(html);
    });
  });

  it('es idempotente', () => {
    const html = '<p>de[cargo]ubicado en<b>[DEPENDENCIA]</b>.[SALARIO][SALARIO_LETRAS]</p>';
    const once = prepareTemplateVariables(html);
    expect(prepareTemplateVariables(once)).toBe(once);
  });
});

describe('LaborCertificatePdfService con variables pegadas', () => {
  const service = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;
  const certificate = {
    full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
    id_number: '53062883',
    career_category: 'Profesional Especializado',
    position_category: 'Cra. Administrativa',
    department: 'Dirección de Talento Humano',
    cod_cargo: '2028',
    cod_grade: '16',
    hiring_date: new Date('2024-05-14T12:00:00Z'),
    issue_date: new Date('2026-10-02T12:00:00Z'),
    monthly_salary: 1000000,
    technical_bonus: 0,
  } as unknown as Certificate;
  const render = (templateHtml: string, includeSalary = true) =>
    service['buildCertificateContent']({
      certificate,
      templateType: 'administrador',
      includeSalary,
      includeTechnicalBonus: false,
      templateHtml,
    }).replace(/<[^>]+>/g, '');

  it('reemplaza una variable pegada a palabras sin agregar espacios (respeta el texto)', () => {
    const text = render('<p>desempeña el cargo de[CARGO]ubicado en[DEPENDENCIA].</p>');
    expect(text).toMatch(/cargo deProfesional Especializado.*16ubicado enDirección de Talento Humano\./);
    expect(text).not.toContain('[');
  });

  it('reemplaza dos variables pegadas entre sí sin agregar espacios', () => {
    const text = render('<p>asignación salarial de [SALARIO][SALARIO_LETRAS] pesos m/cte.</p>');
    expect(text).toContain('de ($1.000.000)un millón pesos m/cte.');
  });

  it('no agrega espacios en ningún caso', () => {
    expect(prepareTemplateVariables('<p>de[CARGO]ubicado y [SALARIO][SALARIO_LETRAS]</p>')).toBe(
      '<p>de[CARGO]ubicado y [SALARIO][SALARIO_LETRAS]</p>',
    );
  });

  it('reemplaza variables en minúsculas, con espacios o partidas por negrita', () => {
    const text = render('<p>Que [nombre empleado] con No. <b>[DOCU</b>MENTO]</p>');
    expect(text).toContain('Que DIANA MARIA GUTIERREZ RAMIREZ con No. 53062883');
  });

  it('sigue ocultando el párrafo del salario aunque las variables estén pegadas', () => {
    const text = render('<p>Que [NOMBRE_EMPLEADO] percibe una asignación salarial de[SALARIO][SALARIO_LETRAS]pesos.</p><p>Se expide.</p>', false);
    expect(text).not.toMatch(/asignaci|\$|millón/);
    expect(text).toContain('Se expide.');
  });

  it.each([true, false])(
    'genera el mismo certificado con variables resaltadas por el editor o escritas a mano (salario %s)',
    (includeSalary) => {
      const tokenEditor = (code: string) =>
        `<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">${code}</span>`;
      const plantilla = (v: (code: string) => string) =>
        `<p>Que ${v('[NOMBRE_EMPLEADO]')} identificado con No. ${v('[DOCUMENTO]')}, cargo de <b>${v('[CARGO]')}</b> ubicado en ${v('[DEPENDENCIA]')}.</p>` +
        `<p>Percibe una asignación salarial de ${v('[SALARIO]')} ${v('[SALARIO_LETRAS]')} pesos m/cte.</p>`;
      const aMano = render(plantilla((code) => code), includeSalary);
      const resaltada = render(plantilla(tokenEditor), includeSalary);
      expect(resaltada).toBe(aMano);
      expect(aMano).toContain('cargo de Profesional Especializado');
    },
  );

  it('una plantilla bien escrita produce exactamente el mismo resultado de siempre', () => {
    const html = '<p>Que [NOMBRE_EMPLEADO] identificado con cédula de ciudadanía No. [DOCUMENTO], desempeña el cargo de [CARGO] ubicado en [DEPENDENCIA].</p>';
    const before = service['buildCertificateContent']({
      certificate, templateType: 'administrador', includeSalary: true, includeTechnicalBonus: false, templateHtml: html,
    });
    expect(prepareTemplateVariables(html)).toBe(html);
    expect(before).toContain('cargo de Profesional Especializado');
  });
});
