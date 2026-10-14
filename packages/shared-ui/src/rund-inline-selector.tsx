import React from 'react';
import type {useRundInline} from '../../shared-hooks/src/useRundInline';

export function RundInlineSelector({panel,person}:{panel:ReturnType<typeof useRundInline>;person:string}) {
  if(!person)return null;
  return <section aria-label="Perfil para requisitos RUND" style={{padding:12,margin:'12px 0',border:'1px solid #D1D5DB',borderRadius:8}}>
    <label style={{fontWeight:700,fontSize:13}} htmlFor="rund-inline-profile">Perfil para requisitos y cargas RUND</label>
    {panel.loading && <p role="status">Consultando perfiles…</p>}
    {panel.error ? <div role="alert"><p>{panel.error}</p><button type="button" onClick={()=>void panel.refresh()}>Reintentar perfiles</button></div> :
      !panel.loading && panel.catalog && <>
        <select id="rund-inline-profile" aria-label="Perfil y periodo RUND" value={panel.key} disabled={panel.busy}
          onChange={e=>panel.choose(e.target.value)} style={{display:'block',padding:8,marginTop:6,maxWidth:'100%',minWidth:240}}>
          <option value="">Seleccione un perfil</option>
          {(['rund','pta'] as const).map(owner=><optgroup key={owner} label={owner==='rund'?'RUND':'Histórico PTA'}>
            {panel.catalog!.perfiles.filter(p=>p.propietario===owner).map(p=><option key={p.clave} value={p.clave}>
              {p.periodo_carga || 'Sin periodo'} · {p.estado} · {p.id}
            </option>)}
          </optgroup>)}
        </select>
        {!panel.key && <p style={{fontSize:12}}>{panel.catalog.perfiles.length ? 'Seleccione el propietario y periodo antes de adjuntar soportes.' : 'Esta persona no tiene perfiles disponibles. Puede consultar sus archivos guardados.'}</p>}
        {panel.selected && <p style={{fontSize:12}}>Los requisitos y las cargas corresponden a {panel.selected.propietario==='rund'?'RUND':'Histórico PTA'} · {panel.selected.periodo_carga || 'sin periodo'}. El listado conserva los archivos de los demás perfiles.</p>}
      </>}
  </section>;
}
