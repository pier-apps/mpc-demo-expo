import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { PierMpcProvider } from "@pier-wallet/mpc-lib/dist/package/react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import React, { useEffect, useState } from "react";
import { ScrollView, useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import Mpc from "./src/Mpc";

export default function App() {
  const isDarkMode = useColorScheme() === "dark";
  const { theme } = useMaterial3Theme();

  const paperTheme = isDarkMode
    ? { ...MD3DarkTheme, colors: theme.dark }
    : { ...MD3LightTheme, colors: theme.light };

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

  // if (!isConnectedToInternet) {
  //   return (
  //     <ScrollView contentInsetAdjustmentBehavior="automatic">
  //       <Text>Not connected to the internet</Text>
  //     </ScrollView>
  //   );
  // }

  return (
    <PaperProvider theme={paperTheme}>
      <PierMpcProvider>
        {/* <Mpc /> */}
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Mpc />
        </ScrollView>
      </PierMpcProvider>
    </PaperProvider>
  );
}
