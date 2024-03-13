import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { useQuery } from "@tanstack/react-query";
import assert from "assert";
import { ethers } from "ethers";
import { useGetSignTokenAndUserId } from "./auth";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";
import { keyShareSecureLocalStorage } from "./keyshare-securelocalstorage";
import { PierWallet } from "./pierMpc-generic";

export const ethereumProvider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_PROVIDER_URL || "https://rpc.sepolia.org",
);

export const getPierKeyShareName = (userId: string, publicKey: string) =>
  `keyshare-${userId}-${publicKey}`;

export const useGetKeyShareCount = () => {
  const { userId } = useGetSignTokenAndUserId();
  const pierMpc = usePierMpc();

  return useQuery({
    queryKey: ["pierBtcVault", userId],
    queryFn: async () => {
      return (await pierMpc.keySharesPublicKeys()).length;
    },
  });
};

export const useGetKeySharesPublicKeys = () => {
  const { userId } = useGetSignTokenAndUserId();
  const pierMpc = usePierMpc();

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
  const pierMpc = usePierMpc();
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
