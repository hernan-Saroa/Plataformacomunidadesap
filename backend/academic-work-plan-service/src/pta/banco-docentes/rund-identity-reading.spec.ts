import { readExplicitIdentityFields } from './rund-identity-reading';
import { validateCandidates } from './rund-extraccion-fields';

describe('Identidad explícita sin completar datos ilegibles',()=>{
  const fields=['documentType','documentNumber','nombreCompleto','genero','sexoBiologico','fechaNacimiento'];
  const read=(texto:string,confianza=.98)=>readExplicitIdentityFields([{pagina:1,texto,confianza}],fields);
  it('recupera cédula impresa y sexo con etiquetas que siguen al valor',()=>{
    const values=Object.fromEntries(read('IDENTIFICACION PERSONAL\nCEDULADEGIUDADANIA\n12.345.678\nNUMERO\nM\nESTATURA\nG.S. RH\nSEXO').map(c=>[c.campo,c.valor]));
    expect(values).toEqual({documentType:'CC',documentNumber:'12345678',genero:'Masculino',sexoBiologico:'Hombre'});
  });
  it('distingue el número de matrícula del documento del titular en una tarjeta profesional',()=>{
    const values=Object.fromEntries(read('52418\nMATRICULA NO.\nCERTIFICAN:\nJOSÉ MUÑOZ PÉREZ\nQUE\nCON C.C. No. 12345678\nEL SECRETARIO\nLUIS GÓMEZ').map(c=>[c.campo,c.valor]));
    expect(values).toEqual({documentType:'CC',documentNumber:'12345678',nombreCompleto:'JOSÉ MUÑOZ PÉREZ'});
  });
  it('lee la sección de identificación de una hoja de vida sin usar libreta militar u otros números',()=>{
    const result=read('DOCUMENTO DE IDENTIFICACION\nSEXO\nC.C. (X) C.E. ( )\nPAS\n12.345.678\nPAIS\nLIBRETA MILITAR\nNUMERO\n76543210');
    expect(result.find(c=>c.campo==='documentNumber')?.valor).toBe('12345678');
    expect(result.find(c=>c.campo==='documentType')?.valor).toBe('CC');
  });
  it('no repara nombres dañados ni convierte una fecha leída parcialmente en nacimiento',()=>{
    expect(read('NOMBRES\nJ0S??\nNACIMIENTO\n9-FEB-1980').filter(c=>['nombreCompleto','fechaNacimiento'].includes(c.campo))).toEqual([]);
  });
  it('no toma un firmante o una libreta militar por datos del titular',()=>{
    expect(read('EL SECRETARIO\nLUIS GÓMEZ\nCON C.C. No. 12345678').some(c=>c.campo==='nombreCompleto')).toBe(false);
    expect(read('TIPO CÉDULA DE CIUDADANIA\nLIBRETA MILITAR\nNUMERO\n87654321').some(c=>c.campo==='documentNumber')).toBe(false);
  });
  it('una copia borrosa del mismo dato no invalida otra aparición legible del mismo fragmento',()=>{
    const text='CON C.C. No. 12345678';
    const result=readExplicitIdentityFields([{pagina:1,texto:text+'\n'+text,confianza:.4,lineas:[{texto:text,confianza:.4},{texto:text,confianza:.99}]}],fields);
    expect(result.find(c=>c.campo==='documentNumber')?.valor).toBe('12345678');
  });
  it.each(['19-FEB-1980','19 de febrero de 1980','19/02/1980'])('normaliza %s solo si la fecha aparece en la evidencia',date=>{
    const text='Fecha de nacimiento: '+date;
    const raw={sugerencias:[{campo:'fechaNacimiento',valor:date,evidencia:text,pagina:1,confianza:.98}]};
    expect(validateCandidates(raw,[{pagina:1,texto:text,confianza:.99}],['fechaNacimiento'])[0].valor).toBe('1980-02-19');
    expect(validateCandidates(raw,[{pagina:1,texto:'Fecha de nacimiento: 9-FEB-1980',confianza:.99}],['fechaNacimiento'])).toEqual([]);
  });
  it('no normaliza fechas inexistentes ni rellena años incompletos',()=>{
    for(const date of ['31-FEB-1980','19-02-80'])expect(validateCandidates({sugerencias:[{campo:'fechaNacimiento',valor:date,evidencia:date,pagina:1,confianza:.99}]},[{pagina:1,texto:date,confianza:.99}],['fechaNacimiento'])).toEqual([]);
  });
  it.each(['SEXO: M','SEXOM','S E X O : M','G E N E R O : M'])('reconoce un marcador explícito %s sin depender de espacios del OCR',text=>{
    expect(Object.fromEntries(read(text).map(c=>[c.campo,c.valor]))).toEqual({genero:'Masculino',sexoBiologico:'Hombre'});
  });
  it('normaliza celdas numéricas explícitas sin reemplazar letras o completar cifras',()=>{
    const run=(text:string)=>validateCandidates({sugerencias:[{campo:'fechaNacimiento',valor:text,evidencia:'Nacimiento: '+text,pagina:1,confianza:.99}]},[{pagina:1,texto:'Nacimiento: '+text,confianza:.99}],['fechaNacimiento']);
    expect(run('DÍA 1 9 MES 0 2 AÑO 1 9 8 0')[0].valor).toBe('1980-02-19');
    expect(run('DÍA 1,9 MES 02 AÑO 1,9,80')[0].valor).toBe('1980-02-19');
    expect(run('DÍA l9 MES 02 AÑO 1980')).toEqual([]);
    expect(run('DÍA 19 MES 02 AÑO 80')).toEqual([]);
  });
  it('respeta baja confianza, conflictos entre documentos y alcance de otras pestañas',()=>{
    expect(read('CON C.C. No. 12345678',.4)).toEqual([]);
    expect(read('CON C.C. No. 12345678\nCON C.C. No. 87654321').some(c=>c.campo==='documentNumber')).toBe(false);
    expect(readExplicitIdentityFields([{pagina:1,texto:'CON C.C. No. 12345678',confianza:.99}],['maestria'])).toEqual([]);
  });
});
