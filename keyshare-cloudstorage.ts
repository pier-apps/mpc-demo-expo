import { KeyShare } from "@pier-wallet/mpc-lib";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";

const cloudStorageScope = CloudStorageScope.AppData;

class KeyShareCloudStorage {
  async saveKeyShare(keyShare: KeyShare, userId: string) {
    await checkIsCloudAvailable();

    // TODO: Wait and retry 5x if iCloud is not available

    const fileName = getFileName(userId);
    const fileExists = await CloudStorage.exists(fileName, cloudStorageScope);
    if (fileExists) {
      throw new Error("KeyShare already exists in cloud storage");
    }

    await CloudStorage.writeFile(
      fileName,
      JSON.stringify(keyShare.raw()),
      cloudStorageScope,
    );
  }

  async getKeyShare(userId: string) {
    await checkIsCloudAvailable();
    const fileName = getFileName(userId);
    const fileExists = await CloudStorage.exists(fileName, cloudStorageScope);
    if (!fileExists) {
      return undefined;
    }
    // TODO: Wait and retry if still syncing (?)

    const fileContents = await CloudStorage.readFile(
      fileName,
      cloudStorageScope,
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
    throw new Error("iCloud is not available");
  }

  return isAvailable;
};

const getFileName = (userId: string) => `/keyshare-${userId}.json`;

export const keyShareCloudStorage = new KeyShareCloudStorage();
