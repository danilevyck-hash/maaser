// El dinero se escribe como lo lee papá: sin centavos cuando no los hay.
// "$678", "$81,198", "$1,234.50".

export function dinero(monto: number | null | undefined): string {
  const n = Number(monto);
  if (!Number.isFinite(n)) return "$0";
  const entero = Math.round(n * 100) % 100 === 0;
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: entero ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
