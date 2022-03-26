import React, { useMemo } from "react";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { ConnectionProvider } from "@solana/wallet-adapter-react";

import "tailwindcss/tailwind.css";
import "../styles/globals.css";
import "../styles/App.css";
import { ModalProvider } from "../contexts/ModalProvider";

const WalletProvider = dynamic(
  () => import("../contexts/ClientWalletProvider"),
  {
    ssr: false,
  }
);

function MyApp({ Component, pageProps }: AppProps) {
  const endpoint = useMemo(() => "https://alice.genesysgo.net", []);

  return (
    <ModalProvider>
      <ConnectionProvider
        endpoint={endpoint}
        config={{ confirmTransactionInitialTimeout: 120000 }}
      >
        <WalletProvider autoConnect>
          <Component {...pageProps} />
        </WalletProvider>
      </ConnectionProvider>
    </ModalProvider>
  );
}

export default MyApp;
