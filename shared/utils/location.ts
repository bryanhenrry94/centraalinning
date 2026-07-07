import { CountryList } from "@/shared/constants/country";

export const getNameCountry = (code: string): string => {
  const country = CountryList.find((c) => c.value === code);
  return country ? country.label : code;
};
