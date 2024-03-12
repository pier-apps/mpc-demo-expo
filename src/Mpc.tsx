import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Appbar, Button } from "react-native-paper";
import { useGenerateKeyShare, useMakeSureWeHaveAccessToCloud } from "./pierMpc";

const GOOGLE_WEB_CLIENT_ID =
  "571078858320-6p05u91onche6so06f62hehkugtip6np.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  "571078858320-b7ubvtat92q0o3nmhrl48aqfv8mprqm1.apps.googleusercontent.com";

export default function Mpc() {
  const pierMpc = usePierMpc();
  const { checkGoogleCloud } = useMakeSureWeHaveAccessToCloud();
  const { generateKeyShare } = useGenerateKeyShare();

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID, // client ID of type WEB for your server. Required to get the `idToken` on the user object, and for offline access.
    scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
    offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    // hostedDomain: '', // specifies a hosted domain restriction
    // forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
    // accountName: '', // [Android] specifies an account name on the device that should be used
    iosClientId: GOOGLE_IOS_CLIENT_ID, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
    // googleServicePlistPath: '', // [iOS] if you renamed your GoogleService-Info file, new name here, e.g. GoogleService-Info-Staging
    // openIdRealm: '', // [iOS] The OpenID2 realm of the home web server. This allows Google to include the user's OpenID Identifier in the OpenID Connect ID token.
    profileImageSize: 120, // [iOS] The desired height (and width) of the profile image. Defaults to 120px
  });

  const signInToPierMpc = async () => {
    const result = await pierMpc.auth.signInWithPassword({
      email: "random@email.com",
      password: "randompassword",
    });

    console.log("🚀 ~ signInToPierMpc ~ result:", result);
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="MPC Demo" />
      </Appbar.Header>

      <Button
        mode="contained"
        style={{ alignSelf: "center", margin: 10 }}
        onPress={signInToPierMpc}
      >
        1. Establish connection with pierMpc
      </Button>

      <Button
        mode="contained"
        style={{ alignSelf: "center", margin: 10 }}
        onPress={generateKeyShare}
      >
        2. Create key shares
      </Button>
      <Button
        mode="contained"
        style={{ alignSelf: "center", margin: 10 }}
        onPress={async () => {
          const result = await GoogleSignin.signIn();
          console.log(result);
        }}
      >
        3. Sign in to google (optional)
      </Button>
      <Button
        mode="contained"
        style={{ alignSelf: "center", margin: 10 }}
        onPress={async () => {
          await checkGoogleCloud();
        }}
      >
        4. Check google cloud tokens
      </Button>
      <Button
        mode="contained"
        style={{ alignSelf: "center", margin: 10 }}
        onPress={async () => {}}
      >
        5. Store key shares in google cloud
      </Button>
    </>
  );
}

const styles = {
  button: {
    alignSelf: "center",
    margin: 10,
  },
};
