import { z } from "zod";
import {
  CollectionCaseSchema,
  CollectionCaseCreateSchema,
  CollectionCaseUpdateSchema,
  CollectionCaseResponseSchema,
  CollectionCaseViewSchema,
} from "@/services/collection/collection.validators";
import { CollectionCaseStatus } from "@/constants/collection-case-status";

export type CollectionCaseFilter = {
  tenant_id: string;
  status?: CollectionCaseStatus;
  debtor_id?: string;
};

export type CollectionCase = z.infer<typeof CollectionCaseSchema>;
export type CollectionCaseCreate = z.infer<typeof CollectionCaseCreateSchema>;
export type CollectionCaseUpdate = z.infer<typeof CollectionCaseUpdateSchema>;
export type CollectionCaseResponse = z.infer<
  typeof CollectionCaseResponseSchema
>;
export type CollectionCaseView = z.infer<typeof CollectionCaseViewSchema>;
