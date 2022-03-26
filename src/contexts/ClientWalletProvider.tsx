import type { WalletProviderProps } from "@solana/wallet-adapter-react";
import { WalletProvider } from "@solana/wallet-adapter-react";

import {
  getPhantomWallet,
  getLedgerWallet,
  getSolflareWallet,
  getSolletWallet,
  getSlopeWallet,
} from '@solana/wallet-adapter-wallets'
import { useMemo } from "react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import('@solana/wallet-adapter-react-ui/styles.css' as any) ;

export function ClientWalletProvider(
  props: Omit<WalletProviderProps, "wallets">
): JSX.Element {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getLedgerWallet(),
      getSlopeWallet(),
      getSolflareWallet(),
      getSolletWallet(),
    ],
    []
  );

  return (
    <WalletProvider wallets={wallets} {...props}>
      <WalletModalProvider {...props} />
    </WalletProvider>
  );


}

export default ClientWalletProvider;
