// `payments.amount` is stored in paise (e.g. 99900 = Rs 999.00).
export const paiseToRupees = (paise: unknown): number => Number(paise || 0) / 100;

export const formatRupees = (rupees: unknown): string => {
  const value = Number(rupees || 0);
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return `Rs ${value.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
};
