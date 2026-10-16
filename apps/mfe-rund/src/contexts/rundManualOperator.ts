/** Contrato estructural del shell. La autoridad para escribir sigue siendo el JWT del servidor. */
export interface RundManualOperatorConnection {
  resolve(options?:{signal?:AbortSignal}):Promise<{version:1;actorId:string}>;
  subscribe(listener:()=>void):()=>void;
}
