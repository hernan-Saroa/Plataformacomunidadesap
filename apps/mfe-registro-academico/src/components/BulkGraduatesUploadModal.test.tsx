import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import graduadosService from '../../services/api/graduados.service';
import { BulkGraduatesUploadModal, buildCatalogs, buildParsedRow } from './BulkGraduatesUploadModal';

vi.mock('../../services/api/graduados.service',()=>({default:{graduados:{crearMasivo:vi.fn()}}}));
vi.mock('motion/react',async()=>{
  const React=await import('react');
  const component=React.forwardRef(({children,initial,animate,exit,transition,layout,...props}:any,ref:any)=>React.createElement('div',{...props,ref},children));
  return {motion:{div:component},AnimatePresence:({children}:any)=>children};
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

const valid={IDENTIFICACION:'123456789',ESTUDIANTE:'LAURA ANDRADE RIVERA',TITULO:'Administración Pública',REGISTRO:'123',ACTA:'28',LIBRO:'3',FECHAREGISTRO:'15-07-2022',ANIOGRADO:'2022',CORREO:'laura@example.com',TELEFONO:'3004567890',TERRITORIAL:'Territorial histórica',SEDE:'Sede del graduado'};
const parse=(changes={})=>buildParsedRow({...valid,...changes},2,new Set(),buildCatalogs([valid.TITULO]));

describe('Carga masiva de Graduados independiente de PTA',()=>{
  it('acepta territorial y sede del graduado sin consultar ni exigir relaciones de otro módulo',()=>{
    const result=parse();
    expect(result.errors).toEqual([]);
    expect(result.payload).toMatchObject({campus:valid.SEDE,seccionalName:valid.TERRITORIAL,degreeTitle:valid.TITULO});
  });
  it.each(['TERRITORIAL','SEDE'])('conserva el campo obligatorio %s',field=>{
    expect(parse({[field]:''}).errors.length).toBeGreaterThan(0);
  });
  it.each([{REGISTRO:'abc'},{ACTA:'0'},{LIBRO:'-1'},{IDENTIFICACION:'CC123'},{FECHAREGISTRO:'15-07-2099',ANIOGRADO:'2099'},{TITULO:'Título inexistente'},{CORREO:'sin-arroba'},{SEDE:'X'.repeat(101)}])('mantiene las validaciones propias de Graduados: %p',changes=>{
    expect(parse(changes).errors.length).toBeGreaterThan(0);
  });
  it('conserva la detección de identificación y título repetidos en el mismo archivo',()=>{
    const duplicates=new Set<string>(),catalogs=buildCatalogs([valid.TITULO]);
    expect(buildParsedRow(valid,2,duplicates,catalogs).errors).toEqual([]);
    expect(buildParsedRow(valid,3,duplicates,catalogs).errors.join(' ')).toContain('repetido');
  });
  it('habilita plantilla y selección de archivo sin recibir ningún catálogo territorial',()=>{
    render(<BulkGraduatesUploadModal open onOpenChange={()=>{}} onImported={()=>{}} programOptions={[valid.TITULO]}/>);
    expect((screen.getByRole('button',{name:'Descargar plantilla XLSX'}) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button',{name:'Seleccionar archivo XLSX'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('lee un Excel real y envía el graduado con su sede y territorial libres a la carga masiva',async()=>{
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([valid]),'GRADUADOS');
    const buffer=XLSX.write(workbook,{type:'array',bookType:'xlsx'});
    const file=new File([buffer],'graduados.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    Object.defineProperty(file,'arrayBuffer',{value:async()=>buffer});
    const created={id:'new-graduate',...parse().payload};
    vi.mocked(graduadosService.graduados.crearMasivo).mockResolvedValue({total:1,createdCount:1,failedCount:0,created:[created as any],errors:[]});
    const imported=vi.fn();
    render(<BulkGraduatesUploadModal open onOpenChange={()=>{}} onImported={imported} programOptions={[valid.TITULO]}/>);
    fireEvent.change(document.querySelector('input[type="file"]')!,{target:{files:[file]}});
    const submit=await screen.findByRole('button',{name:/Crear 1 graduado/});
    fireEvent.click(submit);
    await waitFor(()=>expect(graduadosService.graduados.crearMasivo).toHaveBeenCalledWith([expect.objectContaining({campus:valid.SEDE,seccionalName:valid.TERRITORIAL})],'bulk_upload'));
    await waitFor(()=>expect(imported).toHaveBeenCalledWith([created]));
  });
  it('genera un XLSX real sin listas territoriales restrictivas y conserva controles numéricos y títulos',async()=>{
    let downloaded:Blob|undefined;
    vi.stubGlobal('URL',class extends URL{static createObjectURL=(blob:Blob)=>{downloaded=blob;return 'blob:test';};static revokeObjectURL=()=>{};});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    render(<BulkGraduatesUploadModal open onOpenChange={()=>{}} onImported={()=>{}} programOptions={[valid.TITULO]}/>);
    fireEvent.click(screen.getByRole('button',{name:'Descargar plantilla XLSX'}));
    await waitFor(()=>expect(downloaded).toBeDefined(),{timeout:15000});
    const bytes=await new Promise<ArrayBuffer>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.onerror=reject;reader.readAsArrayBuffer(downloaded!);});
    const zip=await JSZip.loadAsync(bytes);
    const sheet=await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    const document=new DOMParser().parseFromString(sheet,'application/xml');
    const validations=[...document.querySelectorAll('dataValidation')];
    expect(validations.some(rule=>rule.getAttribute('type')==='list'&&rule.getAttribute('sqref')?.includes('C2:'))).toBe(true);
    expect(validations.some(rule=>rule.getAttribute('type')==='custom'&&rule.getAttribute('sqref')?.includes('D2:'))).toBe(true);
    expect(validations.some(rule=>/\b[KL]\d/.test(rule.getAttribute('sqref')||''))).toBe(false);
    expect(await zip.file('xl/workbook.xml')!.async('string')).toContain('PARAMETROS');
  },20000);
});
