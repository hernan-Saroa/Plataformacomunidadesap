import { ETIQUETA_INFORMACION_ADICIONAL, ETIQUETA_INFORMACION_PRECARGADA } from '../../../utils/titulosFormacion';

/** RUND-003: bajo el título de la plantilla (precargado) lista los demás títulos del nivel como información adicional. */
export function TitulosOrigenFila({ nivel, tienePrecargado, adicionales }: { nivel: string; tienePrecargado: boolean; adicionales: string[] }) {
  return (
    <>
      {tienePrecargado && <span className="rund-titulo-etiqueta" data-origen="precargada">{ETIQUETA_INFORMACION_PRECARGADA}</span>}
      {adicionales.length > 0 && (
        <ul className="rund-titulos-adicionales" aria-label={`Títulos adicionales de ${nivel.toLowerCase()}`}>
          {adicionales.map(titulo => (
            <li key={titulo}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflowWrap: 'anywhere' }}>{titulo}</span>
              <span className="rund-titulo-etiqueta" data-origen="adicional">{ETIQUETA_INFORMACION_ADICIONAL}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
