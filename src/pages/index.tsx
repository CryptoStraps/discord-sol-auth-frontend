import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { API_URL, DISCORD_API_URL } from "../constants";
import nacl from "tweetnacl";
import Image from "next/image";

export default function Home() {
  const [user, setUser] = useState<any>();
  const { query } = useRouter();
  const { code } = query;
  const { publicKey, signMessage } = useWallet();
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
      setTxLoading("loading");
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
        const sig = await fetch(
          `${API_URL}/submit?signature=${
            signed.signature.toJSON().data
          }&pubkey=${publicKey.toBase58()}&discordId=${
            user.id
          }&discordHandle=${`${user.username}#${user.discriminator}`}`
        ).then((res) => res && res.json());
        setTxLoading("loaded");
      } else {
        setError(true);
        setTxLoading("loaded");
      }
    }
  }, [publicKey, user]);
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

        <div className="my-8 text-center">
          <div className="bg-black card">

            <div className="text-center card-body">
              <div className="mb-4 card-title">CryptoStraps Whitelist</div>
              <div className="m-3 shadow-lg">
                <Image
                  src="/android-chrome-192x192.png"
                  alt="Logo"
                  width={192}
                  height={192}
                />
              </div>

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
                  {user && publicKey && txLoading === "" && (
                    <button
                      className="mt-2 btn btn-outline"
                      onClick={() => sendTransaction()}
                    >
                      Sign Message
                    </button>
                  )}
                  {user && publicKey && txLoading === "loading" && (
                    <>
                      <button disabled className="btn loading"></button>
                    </>
                  )}
                  {user && publicKey && txLoading === "loaded" && (
                    <>Success! We got your address</>
                  )}
                </>
              }
            </div>
          </div>
          <br />
          <WalletMultiButton/>

        </div>
      </main>
    </div>
  );
}
