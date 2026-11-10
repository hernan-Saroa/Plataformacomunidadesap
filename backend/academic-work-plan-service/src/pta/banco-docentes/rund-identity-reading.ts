import { comparable, extractionComparisonValue, identityMarkerText, validateCandidates } from './rund-extraccion-fields';
import { RundOcrPage } from './rund-ocr-client';

/** Explicit printed identity anchors; never repairs names, numbers or dates. */
export function readExplicitIdentityFields(pages:RundOcrPage[],fields:string[]) {
  const allowed=fields.filter(field=>['documentType','documentNumber','nombreCompleto','genero','sexoBiologico'].includes(field));
  const found:ReturnType<typeof validateCandidates>=[];
  for(const page of pages){
    const lines=page.texto.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const add=(campo:string,valor:string,evidencia:string)=>{
      if(allowed.includes(campo))found.push(...validateCandidates({sugerencias:[{campo,valor,evidencia,pagina:page.pagina,confianza:1}]},[page],[campo]));
    };
    // Only the known document-type label accepts the common C/G OCR confusion.
    for(const line of lines){
      const label=comparable(line).replace(/[^A-Z]/g,'');
      if(/CEDULADE[CG]IUDADANIA/.test(label))add('documentType','CC',line);
      if(/CEDULADEEXTRANJERIA/.test(label))add('documentType','CE',line);
      if(/\bPASAPORTE\b/.test(comparable(line)))add('documentType','PA',line);
    }
    for(let index=0;index<lines.length;index++){
      const line=lines[index];
      if(/\bC\.?\s*C\.?\s*\(\s*[X✓✔]\s*\)/i.test(line))add('documentType','CC',line);
      if(/\bC\.?\s*E\.?\s*\(\s*[X✓✔]\s*\)/i.test(line))add('documentType','CE',line);
      if(/DOCUMENTO\s+DE\s+IDENTIFICACION/.test(comparable(line))){
        const section:string[]=[];
        for(let next=index+1;next<Math.min(lines.length,index+14);next++){
          if(/LIBRETA\s+MILITAR|FECHA.*NACIMIENTO|FORMACION/.test(comparable(lines[next])))break;
          section.push(lines[next]);
        }
        const values=section.filter(value=>/^\d[\d.\s]{4,22}$/.test(value));
        if(values.length===1)add('documentNumber',values[0],[line,...section.slice(0,section.indexOf(values[0])+1)].join('\n'));
      }
      const personal=/\b(?:CON\s+)?(C\.?\s*C\.?|C\.?\s*E\.?)\s*(?:\(\s*[X✓✔]\s*\))?\s*(?:(?:NO|NUMERO|NRO)\.?\s*:?\s*)?([0-9][0-9.\s]{4,22})\b/i.exec(line);
      if(personal){
        add('documentType',personal[1].replace(/[^A-Z]/gi,'').toUpperCase(),line);
        add('documentNumber',personal[2],line);
        // Certification layout: holder's name directly precedes CON C.C. No.
        if(/\bCON\s+C\.?\s*[CE]\b/i.test(line))for(let previous=index-1;previous>=Math.max(0,index-2);previous--){
          const name=lines[previous],words=name.match(/[\p{L}\p{M}]+/gu)||[];
          const context=comparable(lines.slice(Math.max(0,previous-2),previous).join(' '));
          if(!/\b(?:CERTIFICAN?|CONSTAR|TITULAR|BENEFICIARIO|QUE)\b/.test(context))continue;
          if(words.length<2||words.length>8||!/^[\p{L}\p{M}\s'-]+$/u.test(name)
            ||/\b(?:CONSEJO|PRESIDENTE|SECRETAR\w*|CERTIFICAN|REPUBLICA|MATRICULA|ECONOMISTA|UNIVERSIDAD|PROFESIONAL|OTORGAR)\b/.test(comparable(name)))continue;
          add('nombreCompleto',name,lines.slice(previous,index+1).join('\n'));
          break;
        }
      }
      // Printed national ID: the number may precede its NUMERO label.
      if(/^NUMERO\s*:?$/i.test(comparable(line))&&lines.slice(0,index).some(value=>/IDENTIFICACION\s+PERSONAL/.test(comparable(value)))
        &&lines.slice(0,index).some(value=>/CEDULADE[CG]IUDADANIA|CEDULADEEXTRANJERIA/.test(comparable(value).replace(/[^A-Z]/g,'')))){
        for(const candidateIndex of [index-1,index+1])if(/^\d[\d.\s]{4,22}$/.test(lines[candidateIndex]||'')){
          add('documentNumber',lines[candidateIndex],lines.slice(Math.min(index,candidateIndex),Math.max(index,candidateIndex)+1).join('\n'));
        }
      }
      if(/\b(?:SEXO|GENERO)(?:\b|[FM]\b)/.test(identityMarkerText(line))){
        const nearby=lines.slice(Math.max(0,index-4),index+5);
        const marks=new Set([...identityMarkerText(nearby.join(' ')).matchAll(/\b([FM])\s*\(\s*[X✓✔]\s*\)/g)].map(match=>match[1]));
        const inline=identityMarkerText(line).replace(/^.*?\b(?:SEXO|GENERO)/,'');
        const inlineValues=[...inline.matchAll(/\b(F|M|FEMENIN[OA]|MASCULIN[OA]|MUJER|HOMBRE)\b/g)]
          .map(match=>/^(F|FEMENIN[OA]|MUJER)$/.test(match[1])?'F':'M');
        const values=marks.size?[...marks]:[...new Set([...nearby.filter(value=>/^[FM]$/.test(value)),...inlineValues])];
        if(values.length===1){
          const quote=nearby.join('\n');
          add('genero',values[0],quote);add('sexoBiologico',values[0],quote);
        }
      }
    }
  }
  return allowed.flatMap(campo=>{
    const matches=found.filter(item=>item.campo===campo);
    return new Set(matches.map(item=>extractionComparisonValue(campo,item.valor))).size===1?[matches[0]]:[];
  });
}
