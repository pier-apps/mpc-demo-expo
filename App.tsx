import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { ScrollView, Text, useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

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
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Text>Not connected to the internet</Text>
    </ScrollView>
  );
  // }

  // return (
  //   <PaperProvider theme={paperTheme}>
  //     <PierMpcProvider>
  //       <Mpc />
  //     </PierMpcProvider>
  //   </PaperProvider>
  // );
}
