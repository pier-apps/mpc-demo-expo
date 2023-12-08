import "react-native-url-polyfill/auto";

import { PierMpcProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import React from "react";
import Mpc from "./Mpc";

export default function App() {
  return (
    <PierMpcProvider>
      <Mpc />
    </PierMpcProvider>
  );
}
