import { PierMpcProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import React from "react";
import Mpc from "./Mpc";
import { GoogleLogin } from "./GoogleLogin";

export default function App() {
  return (
    <PierMpcProvider>
      <GoogleLogin />
      <Mpc />
    </PierMpcProvider>
  );
}
