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
import nacl from "tweetnacl";
const sleep = (time = 1000) =>
  new Promise((resolve, reject) => setTimeout(() => resolve(undefined), time));

export default function Home() {
  const [user, setUser] = useState<any>();
  const { query } = useRouter();
  const { code } = query;
  const { publicKey, signMessage, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [txid, setTxId] = useState("");
  const [txLoading, setTxLoading] = useState("");
  const [loggingIntoDiscord, setLogginIntoDiscord] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      if (code) {
        const auth = await fetch(`${API_URL}/auth?code=${code}`)
          .catch(() => {
            setUser(null);
          })
          .then((res) => res && res.json());

        if (!auth) {
          return;
        }

        if (auth.error) {
          console.error(auth.error);
          setError(true);
          return;
        }

        fetch(`${DISCORD_API_URL}/users/@me`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        })
          .then((res) => res.json())
          .catch(() => {
            setUser(null);
            setError(true);
          })
          .then((res) => {
            if (res.message === "401: Unauthorized") {
              setUser(null);
              setError(true);
              return;
            }
            setUser(res);
          })
          .then((res) => {
            console.log(res);
          });
      }
    })();
  }, [code]);

  const sendTransaction = useCallback(async () => {
    if (publicKey) {
      if (!signMessage) {
        alert("Wallet doesnt support message signing");
        return;
      }
      const msg = user.id;
      const signed = await (window as any).solana.signMessage(
        new TextEncoder().encode(`${msg}`),
        "utf8"
      );
      var buf = new TextEncoder().encode(`${msg}`);
      const verified = nacl.sign.detached.verify(
        buf,
        signed.signature,
        publicKey.toBytes()
      );
      if (verified) {
        alert(signed.signature.toString())
        const sig = await fetch(
          `${API_URL}/submit?signature=${signed.signature.toJSON().data}&pubkey=${publicKey.toBase58()}&discordId=${user.id}`
        ).then((res) => res && res.json());
        const tx = new Transaction();
        const { blockhash } = await connection.getRecentBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
        tx.add(
          new TransactionInstruction({
            keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(
              `${user.username}#${user.discriminator} (${user.id})`,
              "utf-8"
            ),
            programId: new PublicKey(
              "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
            ),
          })
        );
        await signTransaction!(tx);
        const id = await connection.sendRawTransaction(tx.serialize());
        setTxId(id);
      } else {
        setError(true);
      }
    }
  }, [publicKey, user]);

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
            confirmed = true;
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
        className="flex fixed flex-col justify-center items-center"
        style={{ inset: 0 }}
      >
        <div className="bg-black card">
          <div className="text-center card-body">
            <div className="mb-4 card-title">CryptoStraps Whitelist</div>
            {!user && !code && !error && (
              <>
                <h2 className="mb-3">1. Login to Discord</h2>
                <a href={process.env.NEXT_PUBLIC_DISCORD_AUTH_LINK}>
                  <button
                    className={`btn btn-outline ${
                      loggingIntoDiscord ? "loading" : ""}`}
                    onClick={() => setLogginIntoDiscord(true)}
                  >
                    Connect Discord
                  </button>
                </a>
              </>
            )}

            {code && !error && !user && <>Verifying...</>}
            {code && error && !user && <>Error! Try again.</>}

            {!publicKey && user && !error && (
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
                    Sign Message
                  </button>
                )}
                {txLoading === "loading" && <>waiting for confirmation</>}
                {txLoading === "loaded" && (
                  <a
                    href={`https://explorer.solana.com/tx/${txid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
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
