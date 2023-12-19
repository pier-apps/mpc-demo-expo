import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Button, Platform } from "react-native";
import { CloudStorage } from "react-native-cloud-storage";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  "571078858320-f42r1rpulpfrtt0dlpk3rb31qdv5ecsk.apps.googleusercontent.com";

export const GoogleLogin: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    // redirectUri: makeRedirectUri({ scheme: "mycoolredirect", path: "" }),
    // redirectUri: "mycoolredirect://mpc",
  });

  useEffect(() => {
    console.log("response", response);
    if (response?.type === "success" && response?.authentication?.accessToken) {
      setAccessToken(response.authentication.accessToken);
    }

    if (accessToken) {
      CloudStorage.setGoogleDriveAccessToken(accessToken);
    }
  }, [response, accessToken]);

  return (
    <>
      <Button title="Login" onPress={() => promptAsync()} />
    </>
  );
};
