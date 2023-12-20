import { KeyShare } from "@pier-wallet/mpc-lib";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";
import { useGoogleLogin } from "./useGoogleLogin";

const CLOUD_STORAGE_SCOPE = CloudStorageScope.AppData;
const CLOUD_STORAGE_DIRECTORY = "/pier-mpc-demo";

class KeyShareCloudStorage {
  async saveKeyShare(keyShare: KeyShare, userId: string) {
    await checkIsCloudAvailable();

    // TODO: Wait and retry 5x if iCloud is not available

    // check if directory exists
    const directoryExists = await CloudStorage.exists(
      CLOUD_STORAGE_DIRECTORY,
      CLOUD_STORAGE_SCOPE,
    );
    if (!directoryExists) {
      await CloudStorage.mkdir(CLOUD_STORAGE_DIRECTORY, CLOUD_STORAGE_SCOPE);
    }

    // check if file exists
    const fileName = getFileName(userId);
    const fileExists = await CloudStorage.exists(fileName, CLOUD_STORAGE_SCOPE);
    if (fileExists) {
      throw new Error("KeyShare already exists in cloud storage");
    }

    await CloudStorage.writeFile(
      fileName,
      JSON.stringify(keyShare.raw()),
      CLOUD_STORAGE_SCOPE,
    );
  }

  async getKeyShare(userId: string) {
    await checkIsCloudAvailable();

    const fileName = getFileName(userId);
    const fileExists = await CloudStorage.exists(fileName, CLOUD_STORAGE_SCOPE);
    if (!fileExists) {
      console.log("KeyShare does not exist in cloud storage");
      return undefined;
    }
    // TODO: Wait and retry if still syncing (?)

    const fileContents = await CloudStorage.readFile(
      fileName,
      CLOUD_STORAGE_SCOPE,
    );
    try {
      const paredFileContents = JSON.parse(fileContents);
      return new KeyShare(paredFileContents);
    } catch (e) {
      throw new Error("KeyShare is invalid");
    }
  }
}

const checkIsCloudAvailable = async () => {
  const isAvailable = await CloudStorage.isCloudAvailable();

  if (!isAvailable) {
    useGoogleLogin(); // TODO: This is a hack to trigger the login flow
    console.error("Cloud Storage is not available");
  }

  return isAvailable;
};

// TODO: Add "version", so we can handle recovery with new version of keyshare / new wallet
const getFileName = (userId: string) => `/keyshare-${userId}.json`;

export const keyShareCloudStorage = new KeyShareCloudStorage();
