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
      reason: "No tienes membresía activa",
    };
  }

  // 1. Bloqueo por estado
  if (membership.status === "SUSPENDED" || membership.status === "CANCELED") {
    return {
      allowed: false,
      reason: "Tu membresía está suspendida",
    };
  }

  // 2. Validar expiración
  if (membership.expires_at && new Date(membership.expires_at) < new Date()) {
    return {
      allowed: false,
      reason: "Tu membresía ha expirado",
    };
  }

  // 3. Restricciones por mora
  if (membership.status === "PAST_DUE") {
    const restrictedActions: AppAction[] = [
      AppAction.CREATE_COLLECTION,
      AppAction.BLOK_CHECK,
    ];

    if (restrictedActions.includes(action)) {
      return {
        allowed: false,
        reason: "Debes ponerte al día para usar esta funcionalidad",
      };
    }
  }

  // 4. Todo OK
  return { allowed: true };
};
