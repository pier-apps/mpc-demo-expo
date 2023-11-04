import { PierMpcVaultSdk } from "@pier-wallet/mpc-lib";
import { usePierMpcSdk } from "@pier-wallet/mpc-lib/dist/package/react-native";
import React, { useMemo } from "react";

const PierServerVault = React.createContext<PierMpcVaultSdk>(null as any);

export function usePierServerVault() {
  return React.useContext(PierServerVault);
}

export function PierServerVaultProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pierMpcSdk = usePierMpcSdk();
  const vault = useMemo(() => {
    return new PierMpcVaultSdk(pierMpcSdk);
  }, [pierMpcSdk]);

  return (
    <PierServerVault.Provider value={vault}>
      {children}
    </PierServerVault.Provider>
  );
}
