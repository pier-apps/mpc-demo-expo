import { PierMpcBitcoinWallet } from "@pier-wallet/mpc-lib/dist/package/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/dist/package/ethers-v5";
import { ethers } from "ethers";

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
