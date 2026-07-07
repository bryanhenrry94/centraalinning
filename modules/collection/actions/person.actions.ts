"use server";
import { IdentificationType } from "@/shared/constants/identification-type";
import { PersonInput } from "@/modules/collection/services/person.validators";
import { PersonService } from "@/modules/collection/services/person.service";

export const getPersonById = async (id: string) => {
  return PersonService.getById(id);
};

export const getPersonByIdentification = async (identification: string) => {
  return PersonService.getByIdentification(identification);
};

export const getAllPersons = async (): Promise<PersonInput[]> => {
  return PersonService.getAll();
};

export const getInfoPersonAction = async (
  identificationType: IdentificationType,
  identification: string,
) => {
  return PersonService.getByIdentificationTypeAndValue(identificationType, identification);
};
