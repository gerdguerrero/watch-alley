export function formatUsdFromPhp(php: number, phpPerUsd: number): string {
  if (!Number.isFinite(php) || php <= 0) return "";
  if (!Number.isFinite(phpPerUsd) || phpPerUsd <= 0) return "";
  const usd = php / phpPerUsd;
  // For ≥ $100 drop cents; below that show one decimal so accessories
  // don't read as "$0".
  const formatted =
    usd >= 100
      ? usd.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : usd.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return `≈ $${formatted} USD`;
}
