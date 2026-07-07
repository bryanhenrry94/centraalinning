import { identificationOptions } from "@/shared/constants/identification";

export function filterIdentificationOptionsByPersonType(person_type: string) {
  if (person_type === "INDIVIDUAL") {
    return identificationOptions.filter((item) =>
      ["DNI", "PASSPORT"].includes(item.value)
    );
  }
  if (person_type === "COMPANY") {
    return identificationOptions.filter((item) => ["KVK"].includes(item.value));
  }
  return [];
}
