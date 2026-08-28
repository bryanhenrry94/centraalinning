"use server";

import { requirePlatformOwner } from "@/modules/admin/services/admin-guards";
import { AdminRegistryService } from "@/modules/admin/services/admin-registry.service";
import { TenantService } from "@/modules/tenant/services/tenant.service";
import { PersonService } from "@/modules/collection/services/person.service";
import { LawyerService } from "@/modules/lawyer/services/lawyer.service";
import { BailiffService } from "@/modules/bailiff/services/bailiff.service";
import { PlanService } from "@/modules/settings/services/plan.service";
import { JurisdictionService } from "@/modules/jurisdiction/services/jurisdiction.service";
import { AuditLogService } from "@/modules/verdict/services/audit-log.service";
import { PlanUpdate } from "@/modules/settings/services/plan.validators";

export const getAdminDashboardStats = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getDashboardStats();
};

export const getAdminTenants = async () => {
  await requirePlatformOwner();
  return TenantService.getAll();
};

export const getAdminTenantById = async (id: string) => {
  await requirePlatformOwner();
  return TenantService.getById(id);
};

export const getAdminPersons = async () => {
  await requirePlatformOwner();
  return PersonService.getAll();
};

export const getAdminPersonById = async (id: string) => {
  await requirePlatformOwner();
  return PersonService.getById(id);
};

export const getAdminLawyers = async () => {
  await requirePlatformOwner();
  return LawyerService.getAllForAdmin();
};

export const getAdminLawyerById = async (id: string) => {
  await requirePlatformOwner();
  return LawyerService.getById(id);
};

export const getAdminBailiffs = async () => {
  await requirePlatformOwner();
  return BailiffService.getAllForAdmin();
};

export const getAdminBailiffById = async (id: string) => {
  await requirePlatformOwner();
  return BailiffService.getById(id);
};

export const getAdminDebtClaims = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllDebtClaims();
};

export const getAdminDebtClaimById = async (id: string) => {
  await requirePlatformOwner();
  return AdminRegistryService.getDebtClaimById(id);
};

export const getAdminFinancialAgreements = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllFinancialAgreements();
};

export const getAdminBlockChecks = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllBlockChecks();
};

export const getAdminAdministrativeCollections = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllAdministrativeCollections();
};

export const getAdminBlockades = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllBlockades();
};

export const getAdminCollectiveCollections = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllCollectiveCollections();
};

export const getAdminLegalProcesses = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllLegalProcesses();
};

export const getAdminCaseTransfers = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllCaseTransfers();
};

export const getAdminPayments = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllPayments();
};

export const getAdminObligations = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllObligations();
};

export const getAdminClaimCharges = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllClaimCharges();
};

export const getAdminUsers = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllUsersWithRoles();
};

export const getAdminEmployerConfirmations = async () => {
  await requirePlatformOwner();
  return AdminRegistryService.getAllEmployerConfirmations();
};

export const getAdminPlans = async () => {
  await requirePlatformOwner();
  return PlanService.getPlans();
};

export const updateAdminPlan = async (id: string, data: Partial<PlanUpdate>) => {
  await requirePlatformOwner();
  return PlanService.update(id, data);
};

export const getAdminJurisdictions = async () => {
  await requirePlatformOwner();
  return JurisdictionService.getAll();
};

export const setAdminJurisdictionActive = async (id: string, isActive: boolean) => {
  await requirePlatformOwner();
  return JurisdictionService.setActive(id, isActive);
};

export const getAdminAuditLog = async (page: number = 1, pageSize: number = 50) => {
  await requirePlatformOwner();
  return AuditLogService.getAllPaginated({ page, pageSize });
};
