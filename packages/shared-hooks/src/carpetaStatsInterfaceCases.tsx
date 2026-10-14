import React from 'react';
import { carpetaDocumentStats } from './carpetaDocumentStats';

export function runCarpetaStatsCases(k: any) {
  const { describe,it,expect,render,screen,cleanup,afterEach,Component }=k;
  const documents=[
    {id:'same',servicio_propietario:'auth',estado:'validado'},
    {id:'rund:same',servicio_propietario:'pta',estado:'rechazado'},
    {id:'rund-service:documento:same',servicio_propietario:'rund',estado:'vencido'},
    {id:'pending',servicio_propietario:'auth',estado:'pendiente'},
    {id:'draft',servicio_propietario:'local',estado:'validado',pendiente_de_guardar:true},
    {id:'same',servicio_propietario:'auth',estado:'validado'},
  ].map(d=>({...d,nombre:d.id+'.pdf',categoria:'otros',fecha_subida:'2026-10-13T12:00:00Z',tipo_archivo:'pdf',tamano_bytes:1}));
  afterEach(cleanup);
  describe('contadores de archivos persistidos en la vista real',()=>{
    it('conserva identidades entre propietarios y excluye borradores/repeticiones',()=>{
      expect(carpetaDocumentStats(documents)).toEqual({total:4,validados:1,pendientes:1,rechazados:1,vencidos:1});
    });
    it('los requisitos no sustituyen el estado de archivos y los vencidos tienen contador propio',()=>{
      render(<Component persona={{nombre:'Persona ficticia'}} documentos={documents.slice(0,-1)} isLoading={false} mode="portal"
        tiposDocumentos={[{id:'required',nombre:'Requisito sin archivo',categoria:'personal',activo:true,obligatorio:true}]} />);
      for(const [label,value] of [['GUARDADOS','4'],['VALIDADOS','1'],['PENDIENTES','1'],['RECHAZADOS','1'],['VENCIDOS','1']]) {
        const node=screen.getByText(label); expect(node.closest('button')?.textContent).toContain(value);
      }
    });
  });
}
