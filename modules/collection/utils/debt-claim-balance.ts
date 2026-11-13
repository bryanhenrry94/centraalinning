export interface ObligationBalanceInput {
  beneficiary: string; // "PARTICIPANT" | "CFSB"
  payer: string; // "PARTICIPANT" | "DEBTOR"
  originalAmount: number;
  balanceAmount: number;
  paidAmount: number;
}

// El saldo por cobrar del cliente y el saldo a pagar del deudor no son el
// mismo número, y tampoco son espejo uno del otro:
//
// - "receivableBalance" (cliente): el capital COMPLETO (balanceAmount de la
//   deuda original, beneficiary: PARTICIPANT) — el participante recupera
//   los $1.800 íntegros, no se le resta la comisión CFSB que adelantó. La
//   ruta de pago del deudor está separada: paga el capital al participante
//   Y, por separado, la comisión CFSB directamente a CFSB — eso es lo que
//   permite al participante recuperar el 100% del capital sin perder nada
//   en el camino.
//
// - "participantCfsbCost": lo que el participante ya pagó (o debe pagar) a
//   CFSB por activar el AOP — dato informativo aparte, NO se resta del
//   receivableBalance. Usa originalAmount (monto fijo del costo), no
//   balanceAmount, porque es un gasto que ya ocurrió sin importar el
//   estado de pago del deudor.
//
// - "payableBalance" (deudor): la suma de balanceAmount de TODO lo que el
//   deudor debe pagar (payer: DEBTOR), sin importar el beneficiario — la
//   deuda original al participante, Y su propia comisión CFSB (mismo monto
//   que paga el participante, pero como obligación/pago separado — ver
//   CollectionService.createPending). Baja de verdad cuando el deudor paga
//   cada parte por su canal correspondiente.
//
// - "receivablePaid": lo que el deudor YA pagó al participante por este
//   DebtClaim — suma de paidAmount (beneficiary: PARTICIPANT), que la
//   obligación solo incrementa vía ObligationService.applyAmountToObligation
//   cuando un Payment real se aplica. Es, por construcción, exactamente la
//   suma de los pagos aplicados — más fiable que "principalAmount -
//   receivableBalance" porque principalAmount no se actualiza si luego se
//   agregan obligaciones nuevas al mismo beneficiary (p.ej. una
//   administratieve boete).
export function computeDebtClaimBalances(obligations: ObligationBalanceInput[]) {
  let participantReceivable = 0;
  let participantReceivablePaid = 0;
  let participantCfsbCost = 0;
  let debtorPayable = 0;

  for (const obligation of obligations) {
    if (obligation.payer === "DEBTOR") {
      debtorPayable += obligation.balanceAmount;
    }
    if (obligation.beneficiary === "PARTICIPANT") {
      participantReceivable += obligation.balanceAmount;
      participantReceivablePaid += obligation.paidAmount;
    } else if (obligation.payer === "PARTICIPANT") {
      participantCfsbCost += obligation.originalAmount;
    }
  }

  return {
    receivableBalance: participantReceivable,
    receivablePaid: participantReceivablePaid,
    participantCfsbCost,
    payableBalance: debtorPayable,
  };
}
