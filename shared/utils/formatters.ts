// Convención del sistema (mercado caribeño-neerlandés, ver CLAUDE.md): punto
// como separador de mil, coma como decimal — p. ej. 4.250,55. NUNCA usar
// "en-US" para montos en este proyecto; toda función de formateo de
// números/moneda pasa por acá.
const NUMBER_LOCALE = "nl-NL";

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(NUMBER_LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

// Sin símbolo de moneda — para campos de PDF que ya muestran "USD" como
// prefijo/columna aparte (AanmaningPDF, SommatiePDF, IngebrekestellingPDF).
// Punto como separador de mil, coma como decimal: 4.250,55.
export const formatAmount = (value: string | number): string => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  return new Intl.NumberFormat(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
