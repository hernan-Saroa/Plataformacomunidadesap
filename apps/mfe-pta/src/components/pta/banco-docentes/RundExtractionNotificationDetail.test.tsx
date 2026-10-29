import React from 'react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {act,cleanup,render,screen,fireEvent} from '@testing-library/react';
import {RundExtractionNotificationDetail} from './RundExtractionNotificationDetail';
import {getBancoDocenteById} from '../../../services/api/ptaApi';
vi.mock('../../../services/api/ptaApi',()=>({getBancoDocenteById:vi.fn()}));
vi.mock('./BancoDocenteDetalleInline',()=>({BancoDocenteDetalleInline:({docente}:any)=><tr><td>{docente.nombre}</td></tr>}));
describe('Enlace del aviso RUND',()=>{
  beforeEach(()=>vi.clearAllMocks());
  afterEach(cleanup);
  it('oculta el expediente anterior mientras comprueba el acceso a otro y no restaura datos al denegarlo',async()=>{
    let resolveNext:(value:any)=>void=()=>{};
    vi.mocked(getBancoDocenteById).mockResolvedValueOnce({success:true,data:{id:'primero',nombre:'Docente anterior'}})
      .mockImplementationOnce(()=>new Promise(resolve=>{resolveNext=resolve;}));
    const view=render(<RundExtractionNotificationDetail docenteId="primero" onClose={()=>{}}/>);
    await screen.findByText('Docente anterior');
    view.rerender(<RundExtractionNotificationDetail docenteId="segundo" onClose={()=>{}}/>);
    expect(screen.queryByText('Docente anterior')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
    await act(async()=>resolveNext({success:false,data:null}));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Docente anterior')).toBeNull();
  });
  it('abre por id sin depender de la página del listado ni del periodo seleccionado',async()=>{
    vi.mocked(getBancoDocenteById).mockResolvedValue({success:true,data:{id:'doc',nombre:'Docente de prueba'}});
    const close=vi.fn();render(<RundExtractionNotificationDetail docenteId="doc" onClose={close}/>);
    await screen.findByText('Docente de prueba');expect(getBancoDocenteById).toHaveBeenCalledWith('doc');
    fireEvent.click(screen.getByRole('button',{name:'Volver al listado'}));expect(close).toHaveBeenCalled();
  });
  it('informa un expediente inaccesible sin mostrar datos',async()=>{
    vi.mocked(getBancoDocenteById).mockResolvedValue({success:false,data:null});
    render(<RundExtractionNotificationDetail docenteId="doc" onClose={()=>{}}/>);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
