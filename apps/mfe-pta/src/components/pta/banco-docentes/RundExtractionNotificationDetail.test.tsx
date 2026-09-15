import React from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {RundExtractionNotificationDetail} from './RundExtractionNotificationDetail';
import {getBancoDocenteById} from '../../../services/api/ptaApi';
vi.mock('../../../services/api/ptaApi',()=>({getBancoDocenteById:vi.fn()}));
vi.mock('./BancoDocenteDetalleInline',()=>({BancoDocenteDetalleInline:({docente}:any)=><tr><td>{docente.nombre}</td></tr>}));
describe('Enlace del aviso RUND',()=>{
  beforeEach(()=>vi.clearAllMocks());
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
