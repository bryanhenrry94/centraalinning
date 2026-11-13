// Prijs in de parameter is exclusief ABB — de eindgebruiker betaalt en ziet
// altijd prijs + ABB% bovenop (nooit ABB die uit het totaal wordt
// teruggerekend, zodat het totaal toevallig gelijk blijft aan de parameter).
export function calculateAbb(amount: number, ratePercent: number) {
  const abbAmount = Number(((amount * ratePercent) / 100).toFixed(2));
  const total = Number((amount + abbAmount).toFixed(2));
  return { abbAmount, total };
}
