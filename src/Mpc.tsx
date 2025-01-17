import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { Button, SafeAreaView, Text, View } from "react-native";
import { useGetSignTokenAndUserId } from "./auth";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";
import { keyShareSecureLocalStorage } from "./keyshare-securelocalstorage";
import {
  useMakeSureWeHaveAccessToCloud,
  useRestoreKeyShareFromCloudStorage,
} from "./pierMpc-mobile";
import { ethereumProvider, getPierKeyShareName } from "./pierMpc-queries";

export default function Mpc() {
  const pierMpc = usePierMpc();
  const { checkIsCloudAvailable } = useMakeSureWeHaveAccessToCloud();
  const { restoreKeyShareFromCloudStorage } =
    useRestoreKeyShareFromCloudStorage();
  const { userId } = useGetSignTokenAndUserId();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null,
  );
  const [btcWallet, setBtcWallet] = useState<PierMpcBitcoinWallet | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCloudAvailable, setCloudAvailable] = useState(false);

  // Check access to cloud
  useEffect(() => {
    (async () => {
      const cloudAvailable = await checkIsCloudAvailable();

      if (cloudAvailable) {
        setCloudAvailable(true);
      }
    })();
  }, [checkIsCloudAvailable]);

  // Establish connection with pier's MPC server and "instantiate" wallets
  useEffect(() => {
    (async () => {
      if (!isLoggedIn || !keyShare) {
        return;
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

      setEthWallet(ethWallet);
      setBtcWallet(btcWallet);
    })();
  }, [keyShare, isLoggedIn, pierMpc, ethereumProvider]);

  // Load local keyshare from secure storage
  useEffect(() => {
    (async () => {
      if (!isLoggedIn) {
        return;
      }
      const lastPublicKey = (await pierMpc.keySharesPublicKeys()).at(-1);

      if (!lastPublicKey) {
        return;
      }
      const localKeyShare = await keyShareSecureLocalStorage.getKeyShare(
        getPierKeyShareName(userId, lastPublicKey),
      );

      if (!localKeyShare) {
        return;
      }

      setKeyShare(localKeyShare);
    })();
  }, [isLoggedIn, pierMpc, userId]);

  const signInToPier = async () => {
    try {
      await pierMpc.auth.signInWithPassword({
        email: "mpc-lib-test@example.com",
        password: "123456",
      });
      setIsLoggedIn(true);
    } catch (e) {
      console.error(e);
    }

    console.log("signed in as test user");
  };

  const generateAndSaveKeyShare = async () => {
    const cloudAvailable = await checkIsCloudAvailable();
    if (!cloudAvailable) {
      throw new Error("Cloud is not available");
    }
    try {
      const [mainKeyShare, backupKeyShare] =
        await pierMpc.generateKeyShare2Of3();

      // Define a keysharename to ensure some kind of versioning for future wallets
      const keyShareName = getPierKeyShareName(userId, mainKeyShare.publicKey);

      // Store main keyshare in secure storage (on device)
      await keyShareSecureLocalStorage.saveKeyShare(keyShareName, mainKeyShare);

      // Store backup keyshare in cloud storage
      await keyShareCloudStorage.saveKeyShare(keyShareName, backupKeyShare);

      setKeyShare(mainKeyShare);
    } catch (e) {
      console.error(e);
    }
  };

  // THIS IS JUST FOR DEMO
  const sendEthereumTransaction = async () => {
    if (!ethWallet) return;

    try {
      // send 1/10 of the balance to the zero address
      const receiver = ethers.constants.AddressZero;
      const balance = await ethWallet.getBalance();
      const amountToSend = balance.div(10);

      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await ethWallet.sendTransaction({
        to: receiver,
        value: amountToSend,
      });
      console.log("tx", tx.hash);
    } catch (e) {
      console.error(e);
    } finally {
    }
  };
  const sendBitcoinTransaction = async () => {
    if (!btcWallet) return;

    try {
      const receiver = "tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6"; // testnet faucet
      const amountToSend = 800n; // 0.00000800 BTC = 800 satoshi
      const feePerByte = 1n; // use a fee provider to get a more accurate fee estimate - otherwise check minimum fee manually

      // create a transaction request
      const txRequest = await btcWallet.populateTransaction({
        to: receiver,
        value: amountToSend,
        feePerByte,
      });

      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await btcWallet.sendTransaction(txRequest);
      console.log("tx", tx.hash);
    } catch (e) {
      console.error(e);
    }
  };
  const restoreKeyShareFromCloud = async () => {
    const lastPublicKey = (await pierMpc.keySharesPublicKeys()).at(-1);
    if (!lastPublicKey) {
      throw new Error("publicKey is undefined");
    }
    const backupKeyShare = await restoreKeyShareFromCloudStorage(
      getPierKeyShareName(userId, lastPublicKey),
    );
    setKeyShare(backupKeyShare);
  };
  const deleteLocalKeyShare = async () => {
    if (!keyShare?.publicKey) return;
    await keyShareSecureLocalStorage.deleteKeyShare(
      getPierKeyShareName(userId, keyShare.publicKey),
      keyShare.publicKey,
    );
    setKeyShare(null);
  };
  const deleteCloudKeyShares = async () => {
    if (!keyShare?.publicKey) return;
    await keyShareCloudStorage.deleteKeyShare(
      getPierKeyShareName(userId, keyShare.publicKey),
      keyShare.publicKey,
    );
    setKeyShare(null);
  };

  return (
    <>
      <SafeAreaView>
        {!isLoggedIn && <Button title="Sign in" onPress={signInToPier} />}
        {!isCloudAvailable && (
          <Text>
            Cloud is not available - sign in to your Apple or Google Account
          </Text>
        )}
        {isLoggedIn && isCloudAvailable && (
          <>
            <Button
              title="Generate key share"
              onPress={generateAndSaveKeyShare}
              disabled={!isLoggedIn || !!keyShare}
            />
            {/* Card displaying ETH Address and BTC address */}
            <View>
              <Text>ETH Address: {ethWallet?.address}</Text>
              <Text>BTC Address: {btcWallet?.address}</Text>
            </View>
            <Button
              title="Send Ethereum transaction"
              onPress={sendEthereumTransaction}
              disabled={!ethWallet}
            />
            <Button
              title="Send Bitcoin transaction"
              onPress={sendBitcoinTransaction}
              disabled={!btcWallet}
            />
            <Text>Recovery stuff</Text>
            <Button
              title="Delete local key share"
              onPress={deleteLocalKeyShare}
              disabled={!keyShare}
            />
            <Button
              title="Restore wallet from cloud"
              onPress={restoreKeyShareFromCloud}
            />
            <Button
              title="Delete cloud key shares"
              onPress={deleteCloudKeyShares}
              disabled={!keyShare}
            />
          </>
        )}
      </SafeAreaView>
    </>
  );
}
