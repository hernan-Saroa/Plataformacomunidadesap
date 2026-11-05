import { extractVisualFields } from './rund-visual-fields';
import * as ocr from './rund-ocr-client';
import * as http from './rund-local-http';

describe('Lectura visual compartida por campos documentales',()=>{
  const entry=(valor:string,evidencia:string)=>({valor,evidencia,legible:true,confianza:.98});
  const reply=(fields:any)=>({message:{content:JSON.stringify(fields)}});
  const run=(fields:string[])=>extractVisualFields(Buffer.from('%PDF-fixture'),'http://ocr','http://model','gemma4:e4b',fields);
  beforeEach(()=>{
    jest.spyOn(ocr,'renderRundPdf').mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',enfoque:'focus'}]);
    jest.spyOn(http,'postLocalJson').mockResolvedValue(reply({}));
  });
  afterEach(()=>{jest.restoreAllMocks();delete process.env.RUND_VISUAL_FALLBACK;});

  it.each([
    ['Identidad','documentNumber','12345678','C.C. No. 12.345.678'],
    ['Vinculación','actoAdministrativoVinculacion','Resolución 123 de 2026','Acto de vinculación: Resolución 123 de 2026'],
    ['Académico','nucleoTematico','Gestión Pública','Núcleo temático: Gestión Pública'],
    ['Investigación','investigacion','Proyecto de gobierno local','Certifica su participación en Proyecto de gobierno local'],
    ['Perfil académico','perfilAcademico','Docencia en administración','Perfil académico: Docencia en administración'],
  ])('%s usa definiciones dinámicas y dos lecturas, sin datos esperados del perfil',async(_tab,campo,valor,evidencia)=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({[campo]:entry(valor,evidencia)}));
    const result=await run([campo]);
    expect(result.candidates).toEqual([expect.objectContaining({campo,valor,baja_confianza:true,confianza:.9})]);
    expect(http.postLocalJson).toHaveBeenCalledTimes(2);
    const request=jest.mocked(http.postLocalJson).mock.calls[1][1] as any;
    expect(request.messages[1].images).toEqual(['detail']);
    expect(JSON.stringify(request.messages[1].content)).not.toContain(valor);
    expect(JSON.stringify(request)).not.toContain('valor_previo');
  });
  it('descarta solo el campo discrepante y conserva coincidencias de los demás campos',async()=>{
    const first={nombreCompleto:entry('José Muñoz Pérez','NOMBRES José APELLIDOS Muñoz Pérez'),fechaNacimiento:entry('1980-02-19','FECHA DE NACIMIENTO 19-FEB-1980')};
    const second={...first,fechaNacimiento:entry('1980-02-09','FECHA DE NACIMIENTO 9-FEB-1980')};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(reply(first)).mockResolvedValueOnce(reply(second));
    expect((await run(['nombreCompleto','fechaNacimiento'])).candidates.map(c=>c.campo)).toEqual(['nombreCompleto']);
    expect(http.postLocalJson).toHaveBeenCalledTimes(2);
  });
  it('recupera campos complementarios con una tercera vista sin perder los ya confirmados',async()=>{
    const number={documentNumber:entry('12345678','CC No. 12345678')};
    const birth={fechaNacimiento:entry('1980-02-19','Nacimiento: 19-FEB-1980')};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(reply(number)).mockResolvedValueOnce(reply(birth)).mockResolvedValueOnce(reply({...number,...birth}));
    expect((await run(['documentNumber','fechaNacimiento'])).candidates.map(c=>c.campo)).toEqual(['documentNumber','fechaNacimiento']);
  });
  it('coteja acercamientos regionales para leer formularios sin depender de una miniatura de página',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',zonas:[
      {imagen:'upper',detalle:'upper-detail'},{imagen:'lower',detalle:'lower-detail'},
    ]}]);
    const name={nombreCompleto:entry('José Muñoz Pérez','Nombres José Apellidos Muñoz Pérez')};
    const birth={fechaNacimiento:entry('19-FEB-1980','Fecha de nacimiento 19-FEB-1980')};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(reply(name)).mockResolvedValueOnce(reply(name))
      .mockResolvedValueOnce(reply(birth)).mockResolvedValueOnce(reply(birth));
    const result=await run(['nombreCompleto','fechaNacimiento']);
    expect(result.candidates.map(c=>c.valor)).toEqual(['José Muñoz Pérez','1980-02-19']);
    expect(jest.mocked(http.postLocalJson).mock.calls.map(call=>(call[1] as any).messages[1].images[0])).toEqual(['upper','upper-detail','lower','lower-detail']);
  });
  it('un conflicto entre vistas de una región no se resuelve con otra región',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',zonas:[
      {imagen:'upper',detalle:'upper-detail'},{imagen:'lower',detalle:'lower-detail'},
    ]}]);
    const one={fechaNacimiento:entry('1980-02-19','Nacimiento 19-FEB-1980')},two={fechaNacimiento:entry('1980-02-09','Nacimiento 9-FEB-1980')};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(reply(one)).mockResolvedValueOnce(reply(two)).mockResolvedValueOnce(reply(one)).mockResolvedValueOnce(reply(one));
    expect((await run(['fechaNacimiento'])).candidates).toEqual([]);
  });
  it('prefiere una cita literal del OCR para el nombre y no conserva etiquetas invertidas del modelo',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({nombreCompleto:entry('José Muñoz Pérez','Apellidos José Nombres Muñoz Pérez')}));
    const source={pagina:1,texto:'Muñoz Pérez\nAPELLIDOS\nJosé\nNOMBRES',confianza:.99};
    const result=await extractVisualFields(Buffer.from('pdf'),'http://ocr','http://model','gemma4:e4b',['nombreCompleto'],[source]);
    expect(result.candidates[0].valor).toBe('José Muñoz Pérez');
    expect(source.texto).toContain(result.candidates[0].evidencia);
    expect(result.candidates[0].evidencia).not.toContain('Apellidos José');
  });
  it('no presenta solo los nombres sin apellidos como un nombre completo',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({nombreCompleto:entry('José Luis','José Luis')}));
    expect((await run(['nombreCompleto'])).candidates).toEqual([]);
  });
  it.each([
    entry('52418','Matrícula profesional número 52418'),
    entry('12345678','Código de barras: 12345678'),
    {...entry('12345678','C.C. 12345678'),legible:false},
    {...entry('12345678','C.C. 12345678'),confianza:.4},
  ])('no acepta matrícula, código, dato ilegible ni baja confianza como identificación: %j',async value=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({documentNumber:value}));
    expect((await run(['documentNumber'])).candidates).toEqual([]);
  });
  it('no convierte una fecha de expedición en nacimiento aunque las vistas coincidan',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({fechaNacimiento:entry('2000-02-19','Fecha de expedición 19-FEB-2000')}));
    expect((await run(['fechaNacimiento'])).candidates).toEqual([]);
  });
  it('admite casillas explícitas y fechas en celdas sin inferir atributos por nombres o fotos',async()=>{
    const fields={documentType:entry('CC','C.C. (X) C.E. ( ) PAS ( )'),genero:entry('M','SEXO F ( ) M (X)'),sexoBiologico:entry('M','SEXO F ( ) M (X)'),
      fechaNacimiento:entry('1980-02-19','NACIMIENTO DÍA 19 MES 02 AÑO 1980')};
    jest.mocked(http.postLocalJson).mockResolvedValue(reply(fields));
    expect((await extractVisualFields(Buffer.from('pdf'),'http://ocr','http://model','gemma4:e4b',Object.keys(fields),[{pagina:1,texto:'SEXO F ( ) M (X)',confianza:.99}])).candidates).toHaveLength(4);
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({genero:entry('M','Fotografía de una persona')}));
    expect((await run(['genero'])).candidates).toEqual([]);
  });
  it('no publica sexo o género de una casilla ilegible aunque dos vistas del modelo coincidan',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({genero:entry('F','SEXO F (X)'),sexoBiologico:entry('F','SEXO F (X)')}));
    const unreadable=[{pagina:1,texto:'SEXO\nF\nM',confianza:.99}];
    expect((await extractVisualFields(Buffer.from('pdf'),'http://ocr','http://model','gemma4:e4b',['genero','sexoBiologico'],unreadable)).candidates).toEqual([]);
    const male=[{pagina:1,texto:'SEXO M',confianza:.99}];
    expect((await extractVisualFields(Buffer.from('pdf'),'http://ocr','http://model','gemma4:e4b',['genero','sexoBiologico'],male)).candidates).toEqual([]);
  });
  it('solo acepta campos del tipo documental y no impone OCR donde no aplica',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(reply({estado:'ACTIVO_RUND',fechaNacimiento:entry('1980-02-19','Nacimiento 19-FEB-1980'),
      documentNumber:entry('12345678','C.C. 12345678')}));
    expect((await run(['documentNumber'])).candidates.map(c=>c.campo)).toEqual(['documentNumber']);
    jest.mocked(ocr.renderRundPdf).mockClear();
    expect((await run([])).estado).toBe('NO_APLICA');
    expect((await run(['estado'])).estado).toBe('NO_APLICA');
    expect(ocr.renderRundPdf).not.toHaveBeenCalled();
  });
  it('mantiene compatibilidad con modelos sin visión y permite desactivar explícitamente el respaldo',async()=>{
    expect((await extractVisualFields(Buffer.from('pdf'),'http://ocr','http://model','qwen3.5:4b',['nombreCompleto'])).estado).toBe('NO_APLICA');
    process.env.RUND_VISUAL_FALLBACK='false';
    expect((await run(['nombreCompleto'])).estado).toBe('NO_APLICA');
    expect(ocr.renderRundPdf).not.toHaveBeenCalled();
  });
  it('no publica conjeturas cuando el lector no está disponible',async()=>{
    jest.mocked(ocr.renderRundPdf).mockRejectedValue(new Error('no disponible'));
    expect(await run(['nombreCompleto'])).toEqual({candidates:[],estado:'LECTURA_VISUAL_NO_DISPONIBLE'});
  });
  it('conserva los datos ya cotejados si una región posterior no puede leerse',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',zonas:[
      {imagen:'upper',detalle:'upper-detail'},{imagen:'lower',detalle:'lower-detail'},
    ]}]);
    const value={nombreCompleto:entry('José Muñoz Pérez','Nombres José Apellidos Muñoz Pérez')};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(reply(value)).mockResolvedValueOnce(reply(value)).mockRejectedValueOnce(new Error('lector ocupado'));
    const result=await run(['nombreCompleto']);
    expect(result.estado).toBe('LECTURA_VISUAL_PARCIAL');expect(result.candidates[0].valor).toBe('José Muñoz Pérez');
  });
});
