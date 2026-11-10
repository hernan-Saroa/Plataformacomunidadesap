import { comparable, validateCandidates } from './rund-extraccion-fields';
import { RundOcrPage } from './rund-ocr-client';

/** Read explicit award labels before asking a model to interpret the page. */
export function readExplicitAcademicTitles(pages:RundOcrPage[],fields:string[]) {
  const allowed=fields.filter(field=>['pregrado','especializacion','maestria','doctorado'].includes(field));
  const found:ReturnType<typeof validateCandidates>=[];
  for(const page of pages){
    // Only the known label tolerates OCR spacing; degree words are never repaired.
    const marker=/\bT\s*[IÍ]\s*T\s*U\s*L\s*O(?:\s+(?:PROFESIONAL|ACADEMICO|ACADÉMICO|UNIVERSITARIO))?\s*(?:DE|EN)\s*:?\s*["«“]?/gi;
    for(const match of page.texto.matchAll(marker)){
      const before=comparable(page.texto.slice(Math.max(0,match.index!-140),match.index!));
      if(/\b(?:ASPIRA|CURSANDO|CURSA|INICIAR|OBTENDRA|OPTAR|POSTULA|CANDIDATO|CANDIDATA)\b/.test(before))continue;
      const start=match.index!+match[0].length;
      const tail=page.texto.slice(start,start+350);
      const stop=/[,;:.!?]|\s+(?:A|MEDIANTE|QUIEN|CON|SEG[ÚU]N|EN\s+LA\s+CIUDAD|FECHA|C[ÉE]DULA|ACTA|AREA|ÁREA)\b/i.exec(tail);
      const literal=tail.slice(0,stop?.index??tail.length).trim();
      const value=literal.replace(/\s+/g,' ').replace(/["»”]+$/,'').trim();
      if(!value)continue;
      // A lone consonant can be a word split by OCR ("P ublica"). Do not
      // join or guess it: let the independent visual reader inspect the PDF.
      if(/\b[B-DF-HJ-NP-TV-XZ]\b/i.test(comparable(value)))continue;
      const quote=page.texto.slice(match.index!,start+tail.indexOf(literal)+literal.length);
      for(const campo of allowed)found.push(...validateCandidates({sugerencias:[{campo,valor:value,pagina:page.pagina,evidencia:quote,confianza:1}]},[page],[campo]));
    }
  }
  return allowed.flatMap(field=>{
    const matches=found.filter(item=>item.campo===field);
    return new Set(matches.map(item=>comparable(item.valor))).size===1?[matches[0]]:[];
  });
}
