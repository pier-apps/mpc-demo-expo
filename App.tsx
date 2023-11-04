import "react-native-url-polyfill/auto";

import { PierMpcSdkReactNativeProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import Mpc from "./Mpc";
import React from "react";
import { PierServerVaultProvider } from "./pier-mpc-provider";

export default function App() {
  return (
    <PierMpcSdkReactNativeProvider verbose={true}>
      <PierServerVaultProvider>
        <Mpc />
      </PierServerVaultProvider>
    </PierMpcSdkReactNativeProvider>
  );
}
