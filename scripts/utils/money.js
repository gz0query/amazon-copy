export function formatCurrency(priceCents) {
  const numericValue = Number(priceCents);

  if (!Number.isFinite(numericValue)) {
    return '0.00';
  }

  return (Math.round(numericValue) / 100).toFixed(2);
}

export default formatCurrency;


































