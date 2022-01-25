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

  useEffect(() => {
    (async () => {
      if (code) {
        const auth = await fetch(`/api/auth?code=${code}`)
          .catch(() => {
            setUser(null);
          })
          .then((res) => res && res.json());
        fetch(`https://discord.com/api/v8/users/@me`, {
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
              `https://discord.com/api/v8/guilds/897222373131042877/members/${res.id}`,
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
            await fetch(`/api/validate?txid=${txid}`);
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
        <div className="card bg-gray-800">
          <div className="card-body text-center">
            <div className="card-title mb-4">CryptoStraps Whitelist</div>
            {!user && (
              <>
                <h2 className="mb-3">1. Login to Discord</h2>

                <a href="https://discord.com/api/oauth2/authorize?client_id=935204697030131712&redirect_uri=http%3A%2F%2Flocalhost%3A3000&response_type=code&scope=identify%20guilds">
                  <button className="btn btn-primary">Connect Discord</button>
                </a>
              </>
            )}

            {!publicKey && user && (
              <>
                <h2 className="mb-3">2. Login to Wallet</h2>
                <WalletMultiButton />
              </>
            )}
            {
              <>
                {/* <a href="https://discord.com/api/oauth2/authorize?client_id=935204697030131712&redirect_uri=https%3A%2F%2Fsol-auth.vercel.app&response_type=code&scope=identify"> */}

                {txLoading === "" && user && publicKey && (
                  <button
                    className="mt-2 btn btn-primary"
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
