import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { ReactNativeKeyShareSyncStatus } from "@pier-wallet/mpc-lib/dist/package/react-native-key-share-cloud-storage";
import { useQuery } from "@tanstack/react-query";
import assert from "assert";
import { ethers } from "ethers";
import { useState } from "react";
import { CloudStorage } from "react-native-cloud-storage";
import { useGetSignTokenAndUserId } from "./auth";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";
import { keyShareSecureLocalStorage } from "./keyshare-securelocalstorage";

const ethereumProvider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_PROVIDER_URL || "https://rpc.sepolia.org",
);
const pierMpc = usePierMpc();

export const ETH_DECIMALS = 18;
export const BTC_DECIMALS = 8;
export const ETH_DUST_THRESHOLD = ethers.utils.parseUnits(
  "0.00001", // around 0.01 cents (?) in USD
  ETH_DECIMALS,
);

export type PierWallet = {
  ethWallet: PierMpcEthereumWallet;
  btcWallet: PierMpcBitcoinWallet;
};

export const useSignInToPierMpc = () => {
  const { jwt } = useGetSignTokenAndUserId();
  if (typeof jwt !== "string") {
    return;
  }

  pierMpc.auth.signInWithJwt({
    provider: "bitwala",
    jwt,
  });
};

export const useMakeSureWeHaveAccessToCloud = () => {
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

export const useGenerateKeyShare = () => {
  const { userId } = useGetSignTokenAndUserId();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateKeyShare = async () => {
    if (!userId) {
      throw new Error("UserId is undefined");
    }
    setIsGenerating(true);
    const [mainKeyShare, backupKeyShare] = await pierMpc.generateKeyShare2Of3();

    const keyShareName = getPierKeyShareName(userId, mainKeyShare.publicKey);

    // Store main keyshare in secure storage (on device)
    await keyShareSecureLocalStorage.saveKeyShare(keyShareName, mainKeyShare);

    // Store backup keyshare in cloud storage
    await keyShareCloudStorage.saveKeyShare(keyShareName, backupKeyShare);
    setIsGenerating(false);
  };

  return { generateKeyShare, isGenerating };
};

export const useRestoreKeyShareFromCloudStorage = () => {
  const { userId } = useGetSignTokenAndUserId();
  const [recoveryStatus, setRecoveryStatus] =
    useState<ReactNativeKeyShareSyncStatus>("sync-start");

  const restoreKeyShareFromCloudStorage = async () => {
    if (!userId) {
      throw new Error("UserId is undefined");
    }

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

    const publicKey = getLastKeySharePublicKey(
      await pierMpc.keySharesPublicKeys(),
    );
    const keyShareName = getPierKeyShareName(userId, publicKey);

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
  };
  return { restoreKeyShareFromCloudStorage, recoveryStatus };
};

export const useGetKeyShareCount = () => {
  const { userId } = useGetSignTokenAndUserId();

  return useQuery({
    queryKey: ["pierBtcVault", userId],
    queryFn: async () => {
      return (await pierMpc.keySharesPublicKeys()).length;
    },
  });
};

export const useGetKeySharesPublicKeys = () => {
  const { userId } = useGetSignTokenAndUserId();

  return useQuery({
    queryKey: ["pierKeySharesPublicKeys", userId],
    queryFn: async () => {
      return await pierMpc.keySharesPublicKeys();
    },
  });
};

export const useGetLocalKeyShare = ({
  publicKey,
}: {
  publicKey: string | undefined;
}) => {
  const { userId } = useGetSignTokenAndUserId();

  return useQuery({
    queryKey: ["pierLocalKeyShare", userId, publicKey],
    queryFn: async () => {
      if (!publicKey) {
        throw new Error("publicKey is undefined");
      }
      if (!userId) {
        throw new Error("UserId is undefined");
      }

      // TODO: Extract to a function
      const keyShareName = getPierKeyShareName(userId, publicKey);

      const loadedLocalKeyShare = await keyShareSecureLocalStorage.getKeyShare(
        keyShareName,
      );

      return loadedLocalKeyShare ?? null;
    },
  });
};

export const useGetBackupFromCloudKeyShare = ({
  publicKey,
}: {
  publicKey: string | undefined;
}) => {
  const { userId } = useGetSignTokenAndUserId();

  return useQuery({
    queryKey: ["pierBackupKeyShare", userId, publicKey],
    queryFn: async () => {
      if (!publicKey) {
        throw new Error("publicKey is undefined");
      }
      if (!userId) {
        throw new Error("UserId is undefined");
      }
      const keyShareName = getPierKeyShareName(userId, publicKey);
      return await keyShareCloudStorage.getKeyShare(keyShareName);
    },
  });
};

export const useWallet = (keyShare: KeyShare | null | undefined) => {
  const res = useQuery({
    queryKey: ["wallets", keyShare?.publicKey, keyShare?.partyIndex],
    queryFn: async () => {
      if (!keyShare) {
        throw new Error("KeyShare is undefined");
      }

      const signConnection = await pierMpc.establishConnection(
        SessionKind.SIGN,
        keyShare.partiesParameters,
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpc,
        ethereumProvider,
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        PierMpcBitcoinWalletNetwork.Testnet,
        signConnection,
        pierMpc,
      );
      return { ethWallet, btcWallet };
    },
    refetchInterval: 0,
    retry: false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  return res.data ?? null;
};

export const useBalances = (wallet: PierWallet | null) => {
  assert(
    wallet?.ethWallet.keyShare.publicKey ===
      wallet?.btcWallet.keyShare.publicKey,
    "Public keys do not match",
  );
  return useQuery({
    queryKey: ["balances", wallet?.ethWallet.keyShare.publicKey],
    queryFn: async () => {
      if (!wallet) {
        throw new Error("Wallet is undefined");
      }

      const [ethBalance, btcBalance] = await Promise.all([
        wallet.ethWallet.getBalance(),
        wallet.btcWallet.getBalance(),
      ]);

      return { ethBalance, btcBalance };
    },
  });
};

class PierMpcWallet {
  private async transferBtcAssets(
    oldWallet: PierMpcBitcoinWallet,
    newWallet: PierMpcBitcoinWallet,
  ) {
    if (oldWallet.address.toLowerCase() === newWallet.address.toLowerCase()) {
      throw new Error("Old and new wallet addresses are the same");
    }

    const btcBalance = await oldWallet.getBalance();
    if (btcBalance === 0n) {
      console.log("No BTC balance to transfer");
      return;
    }

    // TODO: Find a good way to get fees
    const fee = 110n;
    const txRequest = await oldWallet.populateTransaction({
      to: newWallet.address,
      value: btcBalance - fee,
      feePerByte: fee,
    });

    const tx = await oldWallet.sendTransaction(txRequest);
    console.log("Tx: ", tx);
    return tx;
  }

  private async transferEthAssets(
    oldWallet: PierMpcEthereumWallet,
    newWallet: PierMpcEthereumWallet,
  ) {
    if (oldWallet.address.toLowerCase() === newWallet.address.toLowerCase()) {
      throw new Error("Old and new wallet addresses are the same");
    }

    const ethBalance = await oldWallet.getBalance();
    if (ethBalance.eq(0)) {
      console.log("No ETH balance to transfer");
      return;
    }

    const populatedTxRequest = await oldWallet.populateTransaction({
      to: newWallet.address,
      value: 1, // just a placeholder - we're rewriting later
    });

    if (!populatedTxRequest.gasLimit) {
      throw new Error("Gas limit is not defined");
    }

    const maxGasPrice =
      populatedTxRequest.gasPrice ?? populatedTxRequest.maxFeePerGas;

    if (!maxGasPrice) {
      throw new Error("Gas price is not defined");
    }

    const fee = ethers.BigNumber.from(populatedTxRequest.gasLimit).mul(
      maxGasPrice,
    );

    const txRequest = {
      ...populatedTxRequest,
      value: ethBalance.sub(fee),
    };

    console.log("🚀 ~ PierMpcWallet ~ fee:", fee, txRequest.value, ethBalance);

    const tx = await oldWallet.sendTransaction(txRequest);
    console.log("Tx", tx);
    return tx;
  }

  async transferAssets({
    oldWallet,
    newWallet,
  }: {
    oldWallet: PierWallet;
    newWallet: PierWallet;
  }) {
    console.log("transferring assets");
    const btcTransferTx = await this.transferBtcAssets(
      oldWallet.btcWallet,
      newWallet.btcWallet,
    );
    const ethTransferTx = await this.transferEthAssets(
      oldWallet.ethWallet,
      newWallet.ethWallet,
    );

    console.log(
      "🚀 ~ PierMpcWallet ~ btcTransferTx:",
      btcTransferTx?.hash,
      ethTransferTx?.hash,
    );

    return { btcTransferTx, ethTransferTx };
  }
}
export const pierMpcWallet = new PierMpcWallet();

// INTERNALS
const getPierKeyShareName = (userId: string, publicKey: string) =>
  `keyshare-${userId}-${publicKey}`;

const getLastKeySharePublicKey = (publicKeys: string[]) => {
  if (publicKeys.length === 0) {
    throw new Error("No public keys");
  }
  return publicKeys[publicKeys.length - 1];
};
