export const getContractTypeLabel = (type: string) => {
  switch (type) {
    case "DELIVERY_OF_GOODS":
      return "Levering van goederen";
    case "SERVICES":
      return "Diensten";
    case "RENT":
      return "Huur";
    case "LOAN":
      return "Lening";
    case "PAYMENT_ARRANGEMENT":
      return "Betalingsregeling";
    case "OTHER":
      return "Overig";
    default:
      return type;
  }
};
