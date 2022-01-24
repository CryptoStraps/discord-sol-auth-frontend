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

export default function Home() {
  const [user, setUser] = useState<any>();
  const { query } = useRouter();
  const { code } = query;
  const wallet = useAnchorWallet();
  const publicKey = wallet?.publicKey;
  const { connection } = useConnection();
  const [txid, setTxId] = useState("");

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
        <div>
          {user ? (
            <>
              <div className="card bg-gray-800">
                <div className="card-body">
                  <WalletMultiButton />

                  <code className="bg-gray-600 p-2 rounded-box my-4">
                    {user.username}#{user.discriminator}
                  </code>
                  {publicKey && (
                    <>
                      <button
                        className="mt-2 btn btn-primary"
                        onClick={() => {
                          sendTransaction();
                        }}
                      >
                        Send proof tx
                      </button>
                      <br />
                      {txid && (
                        <>
                          <div>
                            <a href={`https://explorer.solana.com/tx/${txid}`}>
                              <button className="btn btn-link">
                                View on Explorer
                              </button>
                            </a>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card bg-gray-800">
                <div className="card-body">
                  <a href="https://discord.com/api/oauth2/authorize?client_id=935204697030131712&redirect_uri=https%3A%2F%2Fsol-auth.vercel.app&response_type=code&scope=identify">
                    <button className="btn btn-primary">
                      Connect Discord
                    </button>
                  </a>
                </div>
              </div>
            </>
            
          )}
        </div>

      </main>
    </div>
  );
}
