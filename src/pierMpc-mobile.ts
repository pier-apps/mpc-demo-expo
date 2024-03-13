import { ReactNativeKeyShareSyncStatus } from "@pier-wallet/mpc-lib/dist/package/react-native-key-share-cloud-storage";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { CloudStorage } from "react-native-cloud-storage";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";

export const useMakeSureWeHaveAccessToCloud = () => {
  useEffect(() => {
    if (Platform.OS === "android") {
      checkGoogleCloud();
    }
  }, []);
  const checkGoogleCloud = async () => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      throw new Error("Google auth client id is not available");
    }

    await keyShareCloudStorage.signInWithGoogle(
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      // TODO: Add iCloud client id so we can sign in on iOS
      // process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
    );
  };

  const checkIcloud = async () => {
    throw new Error("Not implemented");
  };

  const checkIsCloudAvailable = async () => {
    return await CloudStorage.isCloudAvailable();
  };
  return { checkGoogleCloud, checkIcloud, checkIsCloudAvailable };
};

export const useRestoreKeyShareFromCloudStorage = () => {
  const [recoveryStatus, setRecoveryStatus] =
    useState<ReactNativeKeyShareSyncStatus>("sync-start");

  const restoreKeyShareFromCloudStorage = async (keyShareName: string) => {
    // START touching me - touching you - sweet caroline
    {
      const tempFileName = "/caroline.txt";
      await CloudStorage.writeFile(tempFileName, "Sweet Caroline");
      // wait for 2 secs to allow iOS triggering sync
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await CloudStorage.unlink(tempFileName);
      if (!(await CloudStorage.exists("/DO_NOT_DELETE_shares"))) {
        await CloudStorage.mkdir("/DO_NOT_DELETE_shares");
      }
      await CloudStorage.writeFile(
        `/DO_NOT_DELETE_shares${tempFileName}`,
        "Sweet Caroline",
      );
      // wait for 2 secs to allow iOS triggering sync
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await CloudStorage.unlink(`/DO_NOT_DELETE_shares${tempFileName}`);
    }
    // END touching me - touching you - sweet caroline

    const callback = (recoveryStatusToSet: ReactNativeKeyShareSyncStatus) => {
      setRecoveryStatus(recoveryStatusToSet);
    };

    const backupKeyShare = await keyShareCloudStorage.getKeyShare(
      keyShareName,
      callback,
    );

    if (!backupKeyShare) {
      throw new Error("No key share found in cloud storage");
    }

    return backupKeyShare;
  };
  return { restoreKeyShareFromCloudStorage, recoveryStatus };
};
