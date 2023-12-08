import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import { Button, View, Text, SafeAreaView } from "react-native";
import { useEffect, useState } from "react";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/dist/package/bitcoin";

import { ethers } from "ethers";
import { usePierMpc } from "@pier-wallet/mpc-lib/dist/package/react-native";

// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.sepolia.org",
);

export default function Mpc() {
  const pierMpc = usePierMpc();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await pierMpc.auth.signInWithPassword({
        email: "mpc-lib-test@example.com",
        password: "123456",
      });
    })();
  }, [pierMpc]);

  const generateKeyShare = async () => {
    try {
      console.log("generating local key share...");
      const [mainKeyShare, backupKeyShare] =
        await pierMpc.generateKeyShare2Of3();

      console.log("local key share generated.", mainKeyShare.publicKey);
      // you should save backupKeyShare as well but we will focus only on the mainKeyShare in this tutorial
      setKeyShare(mainKeyShare);
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

  return (
    <>
      <SafeAreaView />
      <View style={{ flex: 1, padding: 20 }}>
        <Button
          title="Generate Key Share yay"
          onPress={generateKeyShare}
          disabled={isLoading}
        />
        <Text selectable>ETH Address: {ethWallet?.address}</Text>
        <Text selectable>BTC Address: {btcWallet?.address}</Text>

        <Button
          title="Send Ethereum yay"
          onPress={sendEthereumTransaction}
          disabled={isLoading}
        />
        <Button
          title="Send Bitcoin"
          onPress={sendBitcoinTransaction}
          disabled={isLoading}
        />
      </View>
      <SafeAreaView />
    </>
  );
}
