import { AppAction } from "@/shared/constants/AppAction";

type PermissionResult = {
  allowed: boolean;
  reason?: string;
};

export const canUseFeature = (
  membership: {
    status: string;
    expires_at?: Date | null;
  } | null,
  action: AppAction,
): PermissionResult => {
  if (!membership) {
    return {
      allowed: false,
      reason: "Je hebt geen actief lidmaatschap.",
    };
  }

  // 1. Bloqueo por estado
  if (membership.status === "SUSPENDED" || membership.status === "CANCELED") {
    return {
      allowed: false,
      reason: "Je lidmaatschap is opgeschort",
    };
  }

  // 2. Validar expiración
  if (membership.expires_at && new Date(membership.expires_at) < new Date()) {
    return {
      allowed: false,
      reason: "Je lidmaatschap is verlopen",
    };
  }

  // 3. Restricciones por mora
  if (membership.status === "PAST_DUE") {
    const restrictedActions: AppAction[] = [
      AppAction.CREATE_COLLECTION,
      AppAction.BLOK_CHECK,
      // Un tenant en mora no puede iniciar un nuevo GOP, pero sí debe poder
      // seguir gestionando y cancelando los expedientes GOP ya en curso.
      AppAction.TRANSFER_TO_LAWYER,
      // Tampoco puede iniciar un nuevo COP.
      AppAction.START_COP,
    ];

    if (restrictedActions.includes(action)) {
      return {
        allowed: false,
        reason: "Je moet je betaling bijwerken om deze functie te gebruiken",
      };
    }
  }

  // 4. Todo OK
  return { allowed: true };
};
