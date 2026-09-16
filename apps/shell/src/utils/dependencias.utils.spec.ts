import { slugifyDependencia } from './dependencias.utils';

describe('slugifyDependencia', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should prefix with DEP- and include a 2-digit random suffix', () => {
    const result = slugifyDependencia('Subdirección Financiera');
    expect(result).toMatch(/^DEP-.*-\d{2}$/);
    expect(result).toContain('DEP-');
  });

  it('should remove common prefix Subdirección and abbreviate', () => {
    const result = slugifyDependencia('Subdirección Académica');
    expect(result).toMatch(/^DEP-ACA-\d{2}$/);
    expect(result).not.toContain('SUBDIRECCION');
  });

  it('should remove Oficina prefix and abbreviate to 3 chars per word', () => {
    const result = slugifyDependencia('Oficina Control Interno');
    expect(result).toMatch(/^DEP-CON-INT-47$/);
  });

  it('should abbreviate multi-word names to 3 chars per word', () => {
    const result = slugifyDependencia('Subdirección Administrativa y Financiera');
    expect(result).toContain('ADM-FIN');
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('should abbreviate multi-word names with "de" prefix removed', () => {
    const result = slugifyDependencia('Subdirección de Talento Humano');
    expect(result).toContain('TAL-HUM');
  });

  it('should keep abbreviation for single-word names', () => {
    const result = slugifyDependencia('Planificación');
    expect(result).toMatch(/^DEP-PLA-\d{2}$/);
  });

  it('should normalize accented characters and uppercase', () => {
    const result = slugifyDependencia('Subdirección Jurídica');
    expect(result).not.toMatch(/[áéíóúñ]/);
    expect(result).toBe(result.toUpperCase());
    expect(result).toMatch(/^DEP-JUR-\d{2}$/);
  });

  it('should handle numbers in the name', () => {
    const result = slugifyDependencia('Dependencia 5');
    expect(result).toMatch(/^DEP-DEP-5-\d{2}$/);
  });

  it('should return empty string for empty input', () => {
    expect(slugifyDependencia('')).toBe('');
  });

  it('should return empty string for input with only special characters', () => {
    expect(slugifyDependencia('!!!@@@')).toBe('');
  });

  it('should truncate abbreviation to fit within 20-char limit', () => {
    const longName = 'Departamento de Recursos Humanos y Administración Financiera';
    const result = slugifyDependencia(longName);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toMatch(/^DEP-.*-\d{2}$/);
  });

  it('should include random suffix between 10 and 99', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = slugifyDependencia('Test');
    const parts = result.split('-');
    const suffix = parts[parts.length - 1];
    expect(Number(suffix)).toBeGreaterThanOrEqual(10);
    expect(Number(suffix)).toBeLessThanOrEqual(99);
  });

  it('should match seed.sql naming convention', () => {
    expect(slugifyDependencia('Subdirección de Planificación')).toMatch(/^DEP-PLA-\d{2}$/);
    expect(slugifyDependencia('Subdirección Académica')).toMatch(/^DEP-ACA-\d{2}$/);
    expect(slugifyDependencia('Oficina Asesora Jurídica')).toMatch(/^DEP-ASE-JUR-\d{2}$/);
    expect(slugifyDependencia('Oficina de Control Interno')).toMatch(/^DEP-CON-INT-\d{2}$/);
    expect(slugifyDependencia('Subdirección Administrativa y Financiera')).toMatch(/^DEP-ADM-FIN-\d{2}$/);
  });
});
