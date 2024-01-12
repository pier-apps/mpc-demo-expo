import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import React, { useEffect, useState } from "react";
import { Button, Platform, ScrollView, Text } from "react-native";

import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { ethers } from "ethers";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";
import { keyShareSecureLocalStorage } from "./keyshare-securelocalstorage";
import { CloudStorage } from "@pier-wallet/react-native-cloud-storage";

// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.sepolia.org",
);
const GOOGLE_WEB_CLIENT_ID =
  "571078858320-6p05u91onche6so06f62hehkugtip6np.apps.googleusercontent.com";
const userId = "123";

// Scenario 1: New user / create key shares & store backup in cloud

// Scenario 2: Existing user / restore key shares from local secure storage
// Scenario 3: Existing user / restore key shares from cloud storage

// TODO: Secnario 1b: New user / create key shares & store backup with whatever way the user wants
// TODO: Scenario 3b: Existing user / restore key shares from whatever way the user wants

export default function Mpc() {
  const pierMpc = usePierMpc();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null,
  );
  const [btcWallet, setBtcWallet] = useState<PierMpcBitcoinWallet | null>(null);

  const [initialized, setInitiliazed] = useState(false);
  const [restored, setRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isCloudStorageAvailable, setIsCloudStorageAvailable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkCloudStorage = async () => {
      const isAvailable = await CloudStorage.isCloudAvailable();
      setIsCloudStorageAvailable(isAvailable);
      if (
        !isAvailable &&
        Platform.OS === "android" &&
        initialized &&
        !keyShare
      ) {
        await keyShareCloudStorage.signInWithGoogle(GOOGLE_WEB_CLIENT_ID);
        const isAvailable = await CloudStorage.isCloudAvailable();
        setIsCloudStorageAvailable(isAvailable);
      }
    };
    checkCloudStorage();
  }, [initialized]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setKeyShare(null);

      // log in to MPC server
      await pierMpc.auth.signInWithPassword({
        email: "mpc-lib-test@example.com",
        password: "123456",
      });

      // restore main key share from secure local storage
      // TODO: Catch this "properly"
      const mainKeyShare = await keyShareSecureLocalStorage.getKeyShare(userId);

      if (!mainKeyShare && !isCloudStorageAvailable) {
        // no local key share BUT cloud storage is not available
        setIsLoading(false);
        setInitiliazed(true);
        return undefined;
      }
      if (!mainKeyShare) {
        // no local key share BUT cloud storage is available so we can try to restore from there
        await restoreWalletFromCloud();
        setIsLoading(false);
        return undefined;
      }

      // happy life - we have a local key share
      setKeyShare(mainKeyShare);
      setIsLoading(false);
      setInitiliazed(true);
    })();
  }, [pierMpc, isCloudStorageAvailable]);

  const generateKeyShare = async () => {
    setIsLoading(true);
    try {
      const [mainKeyShare, backupKeyShare] =
        await pierMpc.generateKeyShare2Of3();

      // Store main keyshare in secure storage (on device)
      await keyShareSecureLocalStorage.saveKeyShare(userId, mainKeyShare);

      // Store backup keyshare in cloud storage
      await keyShareCloudStorage.saveKeyShare(userId, backupKeyShare);

      setKeyShare(mainKeyShare);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const restoreWalletFromCloud = async () => {
    try {
      console.log("restoring key share from cloud storage...");

      const backupKeyShare = await keyShareCloudStorage.getKeyShare(userId);
      if (!backupKeyShare) {
        return undefined;
      }
      setInitiliazed(true);
      setRestored(true);
      setKeyShare(backupKeyShare);

      // TODO: Allow user to create new account & transfer everything to new account, both chains
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!keyShare) {
      setEthWallet(null);
      setBtcWallet(null);
      return;
    }

    (async () => {
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
      setEthWallet(ethWallet);

      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        PierMpcBitcoinWalletNetwork.Testnet,
        signConnection,
        pierMpc,
      );
      setBtcWallet(btcWallet);
    })();
  }, [keyShare, pierMpc]);

  const sendEthereumTransaction = async () => {
    if (!ethWallet) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };
  const sendBitcoinTransaction = async () => {
    if (!btcWallet) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Text>Loading...</Text>;

  if (!initialized || !isCloudStorageAvailable)
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text>Initializing...</Text>
      </ScrollView>
    );

  if (initialized && !keyShare)
    return (
      <>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Button
            title="Generate key share"
            onPress={generateKeyShare}
            disabled={isLoading}
          />
        </ScrollView>
      </>
    );

  if (initialized && keyShare)
    return (
      <>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          {restored && (
            <Text selectable>
              Key share restored from cloud storage. Please create a new account
              and transfer your funds to the new account.
            </Text>
          )}

          {ethWallet && (
            <Text selectable>ETH Address: {ethWallet.address}</Text>
          )}
          {btcWallet && (
            <Text selectable>BTC Address: {btcWallet.address}</Text>
          )}

          {ethWallet && !restored && (
            <Button
              title="Send Ethereum"
              onPress={sendEthereumTransaction}
              disabled={isLoading}
            />
          )}
          {btcWallet && !restored && (
            <Button
              title="Send Bitcoin"
              onPress={sendBitcoinTransaction}
              disabled={isLoading}
            />
          )}
          <Button
            title="Delete wallet from phone and cloud storage"
            disabled={!keyShare || isLoading}
            onPress={async () => {
              if (!keyShare) return;
              await keyShareCloudStorage
                .deleteKeyShare(userId, keyShare.publicKey)
                .catch((err) => {
                  console.error(
                    "Failed to delete key share from cloud storage",
                    err,
                  );
                });
              await keyShareSecureLocalStorage
                .deleteKeyShare(userId, keyShare.publicKey)
                .catch((err) => {
                  console.error(
                    "Failed to delete key share from secure local storage",
                    err,
                  );
                });
              setKeyShare(null);
            }}
          />
          <Button
            title="Delete wallet from phone storage"
            disabled={!keyShare || isLoading}
            onPress={async () => {
              if (!keyShare) return;
              await keyShareSecureLocalStorage
                .deleteKeyShare(userId, keyShare.publicKey)
                .catch((err) => {
                  console.error(
                    "Failed to delete key share from secure local storage",
                    err,
                  );
                });
            }}
          />
        </ScrollView>
      </>
    );
}
