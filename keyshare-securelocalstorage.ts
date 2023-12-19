import { KeyShare } from "@pier-wallet/mpc-lib";
import * as SecureStore from "expo-secure-store";

class KeyShareSecureLocalStorage {
  async saveKeyShare(keyShare: KeyShare, userId: string) {
    const key = getKey(userId);
    const keyShareRaw = await SecureStore.getItemAsync(key);
    if (keyShareRaw) {
      throw new Error("KeyShare already exists in local secure storage");
    }

    await SecureStore.setItemAsync(key, JSON.stringify(keyShare.raw()));
  }

  async getKeyShare(userId: string) {
    const key = getKey(userId);
    const keyShareRaw = await SecureStore.getItemAsync(key);
    if (!keyShareRaw) {
      return undefined;
    }

    try {
      const parsedKeyShareRaw = JSON.parse(keyShareRaw);
      return new KeyShare(parsedKeyShareRaw);
    } catch (e) {
      throw new Error("KeyShare is invalid");
    }
  }
}

const getKey = (userId: string) => `keyshare-${userId}`;

export const keyShareSecureLocalStorage = new KeyShareSecureLocalStorage();
