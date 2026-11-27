import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import graduadosService from '../../services/api/graduados.service';
import type { GraduadoData } from '../../services/api/graduados.service';
import { BulkGraduatesUploadModal } from './BulkGraduatesUploadModal';
import { buildCatalogs, buildParsedRow, getGraduateColumns } from '../utils/graduateBulkValidation';
import { createGraduateImportHandler } from '../utils/graduateBulkWorkbook';
import type { GraduateImportRequest, GraduateImportResponse } from '../utils/graduateBulkWorkbook';

vi.mock('../../services/api/graduados.service',()=>({default:{graduados:{crearMasivo:vi.fn()}}}));
vi.mock('motion/react',async()=>{
  const React=await import('react');
  const component=React.forwardRef(({children,initial,animate,exit,transition,layout,...props}:any,ref:any)=>React.createElement('div',{...props,ref},children));
  return {motion:{div:component},AnimatePresence:({children}:any)=>children};
});
class WorkbookWorker {
  onmessage?: (event: { data: GraduateImportResponse }) => void;
  private handleRequest = createGraduateImportHandler((data) => this.onmessage?.({ data }));

  postMessage(request: GraduateImportRequest) {
    void this.handleRequest(request);
  }

  terminate() {
    this.onmessage = undefined;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('Worker', WorkbookWorker);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

const valid={IDENTIFICACION:'123456789',ESTUDIANTE:'LAURA ANDRADE RIVERA',TITULO:'Administración Pública',REGISTRO:'123',ACTA:'28',LIBRO:'3',FECHAREGISTRO:'15-07-2022',ANIOGRADO:'2022',CORREO:'laura@example.com',TELEFONO:'3004567890',TERRITORIAL:'Territorial histórica',SEDE:'Sede del graduado'};
const columns = getGraduateColumns(Object.fromEntries(Object.keys(valid).map((key) => [key, key])));
const parse=(changes={})=>buildParsedRow({...valid,...changes},2,new Set(),buildCatalogs([valid.TITULO]),columns);

const graduateFile = (worksheet: XLSX.WorkSheet, sheetName = 'GRADUADOS') => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File([bytes], 'graduados.xlsx');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
  return file;
};

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
    expect(buildParsedRow(valid,2,duplicates,catalogs,columns).errors).toEqual([]);
    expect(buildParsedRow(valid,3,duplicates,catalogs,columns).errors.join(' ')).toContain('repetido');
  });
  it('habilita plantilla y selección de archivo sin recibir ningún catálogo territorial',()=>{
    render(<BulkGraduatesUploadModal open onOpenChange={()=>{}} onImported={()=>{}} programOptions={[valid.TITULO]}/>);
    expect((screen.getByRole('button',{name:'Descargar plantilla XLSX'}) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button',{name:'Seleccionar archivo XLSX'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('lee un Excel real y envía el graduado con su sede y territorial libres a la carga masiva',async()=>{
    const file = graduateFile(XLSX.utils.json_to_sheet([valid]));
    const created={id:'new-graduate',...parse().payload};
    vi.mocked(graduadosService.graduados.crearMasivo).mockResolvedValue({total:1,createdCount:1,failedCount:0,created:[created as any],errors:[]});
    const imported=vi.fn();
    render(<BulkGraduatesUploadModal open onOpenChange={()=>{}} onImported={imported} programOptions={[valid.TITULO]}/>);
    fireEvent.change(document.querySelector('input[type="file"]')!,{target:{files:[file]}});
    const submit=await screen.findByRole('button',{name:/Crear 1 graduado/});
    fireEvent.click(submit);
    await waitFor(() =>
      expect(graduadosService.graduados.crearMasivo).toHaveBeenCalledWith([
        expect.objectContaining({
          campus: valid.SEDE,
          seccionalName: valid.TERRITORIAL,
          graduationDate: '2022-07-15',
        }),
      ], 'bulk_upload'),
    );
    await waitFor(()=>expect(imported).toHaveBeenCalledWith([created]));
  });
  it('envía todas las filas válidas por lotes y conserva la fila de Excel en los errores del servidor', async () => {
    const data = Array.from({ length: 102 }, (_, index) => ({
      ...valid,
      IDENTIFICACION: String(123450000 + index),
    }));
    const sheet = XLSX.utils.aoa_to_sheet([
      Object.keys(valid),
      [],
      ...data.map((row) => Object.values(row)),
      Object.values(data[0]),
    ]);
    const file = graduateFile(sheet, ' Graduados ');
    const upload = vi.mocked(graduadosService.graduados.crearMasivo);
    let finishSecondBatch!: (result: Awaited<ReturnType<typeof upload>>) => void;
    upload
      .mockResolvedValueOnce({ total: 100, createdCount: 100, failedCount: 0, created: [], errors: [] })
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecondBatch = resolve; }));

    const onOpenChange = vi.fn();
    render(<BulkGraduatesUploadModal open onOpenChange={onOpenChange} onImported={() => {}} programOptions={[valid.TITULO]} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    const submit = await screen.findByRole('button', { name: 'Crear 102 graduados' });
    expect(screen.getAllByRole('row')).toHaveLength(101);
    expect(upload).not.toHaveBeenCalled();
    fireEvent.click(submit);

    expect(await screen.findByText('100 de 102 registros procesados')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Creando graduados' }).getAttribute('aria-valuenow')).toBe('98');
    expect((screen.getByRole('button', { name: 'Cerrar' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Descargar plantilla XLSX' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'graduados.xlsx' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Importando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar validación' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();

    finishSecondBatch({
      total: 2,
      createdCount: 1,
      failedCount: 1,
      created: [],
      errors: [{ rowNumber: 3, message: 'Registro duplicado en el servidor' }],
    });
    expect(await screen.findByText('Fila 104: Registro duplicado en el servidor')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect((screen.getByRole('button', { name: 'Cerrar' }) as HTMLButtonElement).disabled).toBe(false);
    expect(upload.mock.calls.map(([payload]) => payload.length)).toEqual([100, 2]);
    expect(upload.mock.calls[1][0][1].idNumber).toBe(data[101].IDENTIFICACION);
  });

  it('muestra el progreso, bloquea el cierre accidental y permite cancelar y elegir otro archivo', async () => {
    const terminate = vi.spyOn(WorkbookWorker.prototype, 'terminate');
    let publish!: (data: GraduateImportResponse) => void;
    const postMessage = WorkbookWorker.prototype.postMessage;
    vi.spyOn(WorkbookWorker.prototype, 'postMessage').mockImplementationOnce(function (this: WorkbookWorker, request) {
      const receive = this.onmessage;
      publish = (data) => receive?.({ data });
      postMessage.call(this, request);
    });
    const pendingFile = new File([], 'pendiente.xlsx');
    const read = vi.fn(() => new Promise<ArrayBuffer>(() => {}));
    Object.defineProperty(pendingFile, 'arrayBuffer', { value: read });
    const props = { onOpenChange: vi.fn(), onImported: vi.fn(), programOptions: [valid.TITULO] };
    render(<BulkGraduatesUploadModal open {...props} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [pendingFile] } });
    const reading = await screen.findByRole('progressbar', { name: 'Leyendo archivo de Excel…' });
    expect(reading.hasAttribute('aria-valuenow')).toBe(false);
    expect(read).toHaveBeenCalledOnce();
    expect((screen.getByRole('button', { name: 'Descargar plantilla XLSX' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'pendiente.xlsx' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Crear graduados' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onOpenChange).not.toHaveBeenCalled();

    act(() => publish({
      type: 'progress',
      progress: { reviewedRows: 23, scannedRows: 25, totalSheetRows: 100 },
    }));
    expect(screen.getByRole('progressbar', { name: 'Validando registros' }).getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByText('23 registros revisados')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar validación' }));
    expect(terminate).toHaveBeenCalledOnce();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    act(() => publish({
      type: 'validated',
      summary: { totalRows: 23, validCount: 23, preview: [] },
    }));
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect((screen.getByRole('button', { name: 'Seleccionar archivo XLSX' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [graduateFile(XLSX.utils.json_to_sheet([valid]))] },
    });
    expect(await screen.findByRole('button', { name: 'Crear 1 graduados' })).toBeTruthy();
    expect(graduadosService.graduados.crearMasivo).not.toHaveBeenCalled();
  });

  it('reporta el avance hasta el final de la hoja y cuenta únicamente los registros revisados', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([Object.keys(valid), [], Object.values(valid)]);
    const send = vi.fn();
    await createGraduateImportHandler(send)({
      type: 'validate',
      file: graduateFile(sheet),
      programOptions: [valid.TITULO],
    });

    const messages = send.mock.calls.map(([message]) => message);
    expect(messages).toMatchObject([
      { type: 'progress', progress: { reviewedRows: 0, scannedRows: 0, totalSheetRows: 2 } },
      { type: 'progress', progress: { reviewedRows: 1, scannedRows: 2, totalSheetRows: 2 } },
      { type: 'validated', summary: { totalRows: 1, validCount: 1 } },
    ]);
  });

  it('conserva el resultado confirmado cuando una petición posterior se interrumpe', async () => {
    const file = graduateFile(XLSX.utils.json_to_sheet(Array.from({ length: 201 }, (_, index) => ({
      ...valid,
      IDENTIFICACION: String(123450000 + index),
    }))));
    const upload = vi.mocked(graduadosService.graduados.crearMasivo);
    upload
      .mockImplementationOnce(async (batch) => ({
        total: batch.length,
        createdCount: batch.length,
        failedCount: 0,
        created: batch.map((row) => ({ ...row, id: row.idNumber } as GraduadoData)),
        errors: [],
      }))
      .mockRejectedValueOnce(new Error('Conexión interrumpida'));
    const onImported = vi.fn();

    render(<BulkGraduatesUploadModal open onOpenChange={() => {}} onImported={onImported} programOptions={[valid.TITULO]} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 201 graduados' }));

    expect(await screen.findByText('100 graduados creados de 100 enviados.')).toBeTruthy();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(onImported).toHaveBeenCalledOnce();
    expect(onImported.mock.calls[0][0]).toHaveLength(100);
  });
  it('genera un XLSX con ejemplos importables en dd/mm/yyyy y conserva las validaciones de la plantilla',async()=>{
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

    const graduatesSheet = XLSX.read(bytes, { type: 'array' }).Sheets.GRADUADOS;
    expect(graduatesSheet.G2).toMatchObject({ t: 'n', w: '15/07/2022' });
    expect(graduatesSheet.G3).toMatchObject({ t: 'n', w: '22/10/2021' });

    const file = new File([bytes], 'plantilla.xlsx');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
    vi.mocked(graduadosService.graduados.crearMasivo).mockResolvedValueOnce({
      total: 2,
      createdCount: 2,
      failedCount: 0,
      created: [],
      errors: [],
    });
    fireEvent.change(window.document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 2 graduados' }));

    await waitFor(() =>
      expect(graduadosService.graduados.crearMasivo).toHaveBeenLastCalledWith([
        expect.objectContaining({ idNumber: '900100001', graduationDate: '2022-07-15' }),
        expect.objectContaining({ idNumber: '900100002', graduationDate: '2021-10-22' }),
      ], 'bulk_upload'),
    );
  },20000);
});
