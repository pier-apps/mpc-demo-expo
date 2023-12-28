import { statusCodes } from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";

const GOOGLE_WEB_CLIENT_ID =
  "571078858320-6p05u91onche6so06f62hehkugtip6np.apps.googleusercontent.com";

export const useGoogleLogin = () => {
  const [signedIn, setSignedIn] = useState(false);
  const signIn = async () => {
    try {
      await keyShareCloudStorage.signInWithGoogle(GOOGLE_WEB_CLIENT_ID);
      setSignedIn(true);
    } catch (error: any) {
      console.log("error", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
        console.log("SIGN_IN_CANCELLED");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
        console.log("IN_PROGRESS");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
        console.log("PLAY_SERVICES_NOT_AVAILABLE");
      } else {
        // some other error happened
        console.log("some other error happened");
      }
    }
  };

  return { signIn, signedIn };
};
