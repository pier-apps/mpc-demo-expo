import { PierMpcProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import React, { useEffect } from "react";
import Mpc from "./Mpc";
import { Text } from "react-native";
import { useGoogleLogin } from "./useGoogleLogin";

export default function App() {
  const { signIn, signedIn } = useGoogleLogin();
  useEffect(() => {
    (async () => {
      if (!signedIn) {
        await signIn();
      }
    })();
  }, [signedIn]);

  if (!signedIn) {
    return <Text>Signing in...</Text>;
  }

  return (
    <PierMpcProvider>
      <Mpc />
    </PierMpcProvider>
  );
}
