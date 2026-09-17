// FAR (Financiële Afspraken Registreren): servicio independiente y
// preventivo, sin seguimiento activo. Ver docs/schema-design-far-overdracht.md.
// El precio real es configurable por el Superadministrador vía Parameter/
// Jurisdiction (ParameterService.getParameterForTenant().far_registration_fee)
// — esta constante solo sirve de fallback si ese valor no está disponible.
export const FAR_REGISTRATION_FEE = 10;
