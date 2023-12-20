import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import { Button, Text, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";

import { ethers } from "ethers";
import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";
import { keyShareCloudStorage } from "./keyshare-cloudstorage";
import { keyShareSecureLocalStorage } from "./keyshare-securelocalstorage";

// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.sepolia.org",
);
const userId = "123";

// Scenario 1: New user / create key shares & store backup in cloud

// Scenario 2: Existing user / restore key shares from local secure storage
// Scenario 3: Existing user / restore key shares from cloud storage

// TODO: Secnario 1b: New user / create key shares & store backup with whatever way the user wants
// TODO: Scenario 3b: Existing user / restore key shares from whatever way the user wants

export default function Mpc() {
  const pierMpc = usePierMpc();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [restored, setRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setKeyShare(null);

      await pierMpc.auth.signInWithPassword({
        email: "mpc-lib-test@example.com",
        password: "123456",
      });

      // restore main key share from secure local storage
      const mainKeyShare = await keyShareSecureLocalStorage.getKeyShare(userId);

      if (!mainKeyShare) {
        // no main key share found, try to restore from cloud
        await restoreWalletFromCloud();
        setIsLoading(false);
        return undefined;
      }
      setKeyShare(mainKeyShare);
      setIsLoading(false);
    })();
  }, [pierMpc]);

  const generateKeyShare = async () => {
    try {
      console.log("generating local key share...");
      const [mainKeyShare, backupKeyShare] =
        await pierMpc.generateKeyShare2Of3();

      console.log("local key share generated.");

      // Store main keyshare in secure storage (on device)
      await keyShareSecureLocalStorage.saveKeyShare(mainKeyShare, userId);

      // Store backup keyshare in cloud storage
      await keyShareCloudStorage.saveKeyShare(backupKeyShare, userId);

      setKeyShare(mainKeyShare);
    } catch (e) {
      console.error(e);
    }
  };

  const restoreWalletFromCloud = async () => {
    try {
      const backupKeyShare = await keyShareCloudStorage.getKeyShare(userId);

      if (!backupKeyShare) {
        return undefined;
      }
      setRestored(true);
      setKeyShare(backupKeyShare);

      // TODO: Allow user to create new account & transfer everything to new account, both chains
    } catch (e) {
      console.error(e);
    }
  };

  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null,
  );
  const [btcWallet, setBtcWallet] = useState<PierMpcBitcoinWallet | null>(null);

  useEffect(() => {
    if (!keyShare) return;

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

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {!keyShare && (
          <Button
            title="Generate Key Share"
            onPress={generateKeyShare}
            disabled={isLoading}
          />
        )}

        {keyShare && restored && (
          <Text selectable>
            Key share restored from cloud storage. Please create a new account
            and transfer your funds to the new account.
          </Text>
        )}

        {ethWallet && <Text selectable>ETH Address: {ethWallet?.address}</Text>}
        {btcWallet && <Text selectable>BTC Address: {btcWallet?.address}</Text>}

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
      </ScrollView>
    </>
  );
}
