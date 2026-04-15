import { useEffect } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { SessionWarningDialog } from "@/components/auth/SessionWarningDialog";
import { useAuth } from "@/hooks/useAuth";

export function SessionInitializer() {
  const { user } = useAuth();
  const {
    showExpiryWarning,
    warningDetails,
    extendSession,
    logout,
  } = useSessionManager({
    autoInitialize: true,
    onSessionWarning: (warning) => {
      console.log("Session warning:", warning);
    },
    onSessionEnd: () => {
      console.log("Session ended");
    },
  });

  if (!user) return null;

  return (
    <SessionWarningDialog
      warning={warningDetails}
      isOpen={showExpiryWarning}
      onExtend={extendSession}
      onLogout={logout}
    />
  );
}
