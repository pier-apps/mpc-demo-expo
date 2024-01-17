import { PierMpcProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import React, { useEffect, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import Mpc from "./src/Mpc";
import { ScrollView, Text } from "react-native";
import "./global.css";

export default function App() {
  const [isConnectedToInternet, setIsConnectedToInternet] = useState(true);

  const onNetworkStateChange = (newState: NetInfoState) => {
    if (!newState.isInternetReachable) {
      setIsConnectedToInternet(false);
    }
    setIsConnectedToInternet(true);
  };

  const initialCheck = async () => {
    const connectionInfo = await NetInfo.fetch();
    if (!connectionInfo.isInternetReachable) {
      setIsConnectedToInternet(false);
    }
    setIsConnectedToInternet(true);
  };

  useEffect(() => {
    initialCheck();
    NetInfo.addEventListener(onNetworkStateChange);
  }, []);

  if (!isConnectedToInternet) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text>Not connected to the internet</Text>
      </ScrollView>
    );
  }

  return (
    <PierMpcProvider>
      <Mpc />
    </PierMpcProvider>
  );
}
