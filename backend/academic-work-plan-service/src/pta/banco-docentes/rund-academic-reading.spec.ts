import { readExplicitAcademicTitles } from './rund-academic-reading';

describe('Lectura literal de títulos explícitos en OCR',()=>{
  const read=(texto:string,fields=['pregrado'],confidence=0.95)=>readExplicitAcademicTitles([{pagina:1,texto,confianza:confidence}],fields);
  it('recupera un pregrado partido en varias líneas sin completar las palabras del título',()=>{
    const result=read('UNIVERSIDAD\nOTORGO\nEL\nT I TULO\nDE LICENCIADO\nEN\nCIENCIAS SOCIALES A PERSONA DE PRUEBA');
    expect(result).toEqual([expect.objectContaining({campo:'pregrado',valor:'LICENCIADO EN CIENCIAS SOCIALES'})]);
  });
  it('recupera una maestría legible y excluye el área y el acto que siguen al título',()=>{
    const result=read('Que se le otorgó el título de MAGISTER EN CIENCIAS ECONOMICAS,- Área de Profundización: Teoría - mediante Acta 266.',['maestria']);
    expect(result[0].valor).toBe('MAGISTER EN CIENCIAS ECONOMICAS');
    expect(result[0].evidencia).toBe('título de MAGISTER EN CIENCIAS ECONOMICAS');
  });
  it.each(['título de FACULTAD DE CIENCIAS ECONOMICAS','título de AENTACIONHDEIUAHTUNT','Universidad: Economista','título de Doctor en Derecho'])('no convierte un encabezado, basura, inferencia o nivel distinto en pregrado: %s',texto=>{
    expect(read(texto)).toEqual([]);
  });
  it('conserva la abstención por baja confianza aunque la frase sea coherente',()=>{
    expect(read('Título de: Economista',['pregrado'],0.4)).toEqual([]);
    expect(readExplicitAcademicTitles([{pagina:1,texto:'Título de: Economista',confianza:0.99,lineas:[{texto:'Título de:',confianza:0.99},{texto:'Economista',confianza:0.4}]}],['pregrado'])).toEqual([]);
  });
  it('no escoge entre títulos diferentes del mismo nivel en un documento',()=>{
    expect(read('Título de: Economista.\nTítulo de: Abogado.')).toEqual([]);
  });
  it.each(['Aspira al título de Economista','Cursando para optar al título de Economista','Candidato al título de Economista'])('no convierte una expectativa en un grado otorgado: %s',texto=>{
    expect(read(texto)).toEqual([]);
  });
});
