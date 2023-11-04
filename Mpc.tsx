import { KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import { Button, View, Text } from "react-native";
import { useEffect, useState } from "react";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import { ethers } from "ethers";
import _ from "lodash";
import { usePierServerVault } from "./pier-mpc-provider";
import { usePierMpcSdk } from "@pier-wallet/mpc-lib/dist/package/react-native";

// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.sepolia.org"
);

export default function Mpc() {
  const pierMpcSdk = usePierMpcSdk();
  const pierMpcVaultSdk = usePierServerVault();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateKeyShare = async () => {
    try {
      console.log("generating local key share...");
      const tempKeyShare = await pierMpcVaultSdk.generateKeyShare();

      console.log(
        "🚀 ~ file: Mpc.tsx:27 ~ generateKeyShare ~ tempKeyShare:",
        tempKeyShare
      );

      console.log("local key share generated.", tempKeyShare.publicKey);
      setKeyShare(tempKeyShare);
    } catch (e) {
      console.error(e);
    }
  };

  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null
  );
  useEffect(() => {
    if (!keyShare) return;
    (async () => {
      const signConnection = await pierMpcVaultSdk.establishConnection(
        SessionKind.SIGN
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpcVaultSdk,
        ethereumProvider
      );
      setEthWallet(ethWallet);
    })();
  }, [keyShare]);

  const sendEthereumTransaction = async () => {
    if (!ethWallet) return;

    setIsLoading(true);
    try {
      // send 1/10 of the balance to a zero address
      const receiver = ethers.constants.AddressZero;
      const balance = await ethWallet.getBalance();
      const amountToSend = balance.div(10);

      // create a transaction request
      const txRequest = await ethWallet.populateTransaction({
        to: receiver,
        value: amountToSend,
      });
      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await ethWallet.sendTransaction(txRequest);
      console.log("tx", tx.hash);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={{ flex: 1, padding: 20 }}>
        <Button
          title="Sign in as Test (fix)!"
          onPress={async () => {
            await pierMpcSdk.auth.signInWithPassword({
              email: "mpc-lib-test@example.com",
              password: "123456",
            });

            console.log("signed in as test user");
          }}
        />
        <Button
          title="Generate Key Share yay"
          onPress={generateKeyShare}
          disabled={isLoading}
        />
        <Text selectable>Address: {ethWallet?.address}</Text>
        <Text>PublicKey: {keyShare?.publicKey.join(",")}</Text>
        <Button
          title="Send Ethereum yay"
          onPress={sendEthereumTransaction}
          disabled={isLoading}
        />
      </View>
    </>
  );
}
