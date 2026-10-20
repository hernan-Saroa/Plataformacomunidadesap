export function DocenciaCrucesAlert({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Cruce de fechas presenciales</p>
      <p className="mt-1">Se detectó cruce de fechas entre asignaturas presenciales. Verifique la programación; el PTA podrá enviarse a aprobación con esta alerta.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
      </ul>
    </div>
  );
}
