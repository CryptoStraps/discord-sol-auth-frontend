import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Transaction,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { API_URL, DISCORD_API_URL } from "../constants";
const sleep = (time = 1000) =>
  new Promise((resolve, reject) => setTimeout(() => resolve(undefined), time));

export default function Home() {
  const [user, setUser] = useState<any>();
  const { query } = useRouter();
  const { code } = query;
  const wallet = useAnchorWallet();
  const publicKey = wallet?.publicKey;
  const { connection } = useConnection();
  const [txid, setTxId] = useState("");
  const [txLoading, setTxLoading] = useState("");
  const [loggingIntoDiscord, setLogginIntoDiscord] = useState(false);

  useEffect(() => {
    (async () => {
      if (code) {
        const auth = await fetch(
          `${API_URL}/auth?code=${code}`
        )
          .catch(() => {
            setUser(null);
          })
          .then((res) => res && res.json());

        if (!auth) {
          return;
        }
        fetch(`${DISCORD_API_URL}/users/@me`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        })
          .then((res) => res.json())
          .catch(() => {
            setUser(null);
          })
          .then((res) => {
            if (res.message === "401: Unauthorized") {
              setUser(null);
              return;
            }
            setUser(res);

            return fetch(
              `${DISCORD_API_URL}/guilds/897222373131042877/members/${res.id}`,
              {
                headers: { Authorization: `Bearer ${auth.access_token}` },
              }
            ).then((res) => res.json());
          })
          .then((res) => {
            console.log(res);
          });
      }
    })();
  }, [code]);

  const sendTransaction = useCallback(async () => {
    if (publicKey) {
      const transferTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_DESTINATION_KEY!),
          lamports: 0,
        })
      );

      await transferTransaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(`${user.username}#${user.discriminator}`, "utf-8"),
          programId: new PublicKey(
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          ),
        })
      );
      const { blockhash } = await connection.getRecentBlockhash();
      transferTransaction.recentBlockhash = blockhash;
      transferTransaction.feePayer = publicKey;
      await wallet.signTransaction(transferTransaction);

      const txid = await connection.sendRawTransaction(
        transferTransaction.serialize()
      );
      setTxId(txid);
    }
  }, [publicKey]);

  useEffect(() => {
    (async () => {
      if (txid) {
        setTxLoading("loading");
        let confirmed;
        while (!confirmed) {
          const tx = await connection.getConfirmedTransaction(txid);
          if (tx) {
            setTxLoading("loaded");
            await fetch(`${API_URL}/validate?txid=${txid}`);
          }
          await sleep(1000);
        }
      }
    })();
  }, [txid]);
  return (
    <div>
      <Head>
        <title>Onchain Auth</title>
        <meta
          name="description"
          content="Solana-Discord on-chain authentication"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        className="fixed flex flex-col justify-center items-center"
        style={{ inset: 0 }}
      >
        <div className="card bg-black">
          <div className="card-body text-center">
            <div className="card-title mb-4">CryptoStraps Whitelist</div>
            {!user && (
              <>
                <h2 className="mb-3">1. Login to Discord</h2>
                <a href={process.env.NEXT_PUBLIC_DISCORD_AUTH_LINK}>
                  <button
                    className={`btn btn-outline ${
                      loggingIntoDiscord ? " loading" : ""
                    }`}
                    onClick={() => setLogginIntoDiscord(true)}
                  >
                    Connect Discord
                  </button>
                </a>
              </>
            )}

            {!publicKey && user && (
              <>
                <code>{`${user.username}#${user.discriminator}`}</code>
                <h2 className="mb-3">2. Login to Wallet</h2>
                <WalletMultiButton />
              </>
            )}
            {
              <>
                {txLoading === "" && user && publicKey && (
                  <button
                    className="mt-2 btn btn-outline"
                    onClick={() => {
                      sendTransaction();
                    }}
                  >
                    Send proof tx
                  </button>
                )}
                {txLoading === "loading" && <>waiting for confirmation</>}
                {txLoading === "loaded" && (
                  <a href={`https://explorer.solana.com/tx/${txid}`}>
                    <button className={`btn btn-link`}>View on Explorer</button>
                  </a>
                )}
              </>
            }
          </div>
        </div>
      </main>
    </div>
  );
}
