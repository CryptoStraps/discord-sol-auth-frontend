import React, { useMemo } from "react";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

import "tailwindcss/tailwind.css";
import "../styles/globals.css";
import "../styles/App.css";

const WalletProvider = dynamic(
  () => import("../contexts/ClientWalletProvider"),
  {
    ssr: false,
  }
);

function MyApp({ Component, pageProps }: AppProps) {
  const endpoint = useMemo(() => "https://alice.genesysgo.net", []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider autoConnect>
        <Component {...pageProps} />
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;
