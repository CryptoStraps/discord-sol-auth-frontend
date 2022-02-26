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
  const [found, setFound] = useState(false);

  /**
   * START: Monkey patch of doom
   */
  useEffect(() => {
    (async () => {
      if (code) {
        const auth = await fetch(`${API_URL}/auth?code=${code}`)
          .catch((e) => {
            setUser(null);
            alert(
              `Problem with authentication, please restart the process and make sure you are in the right discord server. \n ${e}`
            );
          })
          .then((res) => res && res.json());

        if (!auth) {
          return;
        }

        if (auth.error) {
          console.error(auth.error);
          alert(
            `Problem with authentication, please restart the process and make sure you are in the right discord server. \n ${auth.error}`
          );
          setError(true);
          return;
        }

        let myUser;
        let tries = 0;
        while (!myUser && tries < 5) {
          tries++;
          await fetch(`${DISCORD_API_URL}/users/@me`, {
            headers: { Authorization: `Bearer ${auth.access_token}` },
          })
            .then(async (res) => {
              myUser = await res.json();
              setUser(myUser);
            })
            .catch((e) => {
              if (tries >= 5) {
                setUser(null);
                setError(true);
                alert(
                  `Problem with authentication, please restart the process and make sure you are in the right discord server. \n ${e}`
                );
              }
            });
        }
      }
    })();
  }, [code]);

  useEffect(() => {
    (async () => {
      try {
        if (publicKey) {
          const hasRegistered = await fetch(
            `${API_URL}/status/one?pubkey=${publicKey?.toBase58()}`
          ).then((res) => res.json());
          setFound(hasRegistered.found);
        }
      } catch {}
    })();
  }, [publicKey]);

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
        const handle = `${user.username}-${user.discriminator}`;
        if (!user.username || !user.discriminator) {
          alert("Oh, oh, something went wrong. Please restart!");
          window.location.href = "https://whitelist.cryptostraps.io";
          return;
        }
        const sig = await fetch(
          `${API_URL}/submit?signature=${
            signed.signature.toJSON().data
          }&pubkey=${publicKey.toBase58()}&discordId=${
            user.id
          }&discordHandle=${handle}`
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
              <div className="shadow-lg">
                <Image src="/logogo.png" alt="Logo" width={192} height={125} />
              </div>

              <div className="my-6">
                <h2 className="mb-3">1. Connect Wallet</h2>

                <WalletMultiButton />
              </div>

              {found && (
                <>
                  <div className="shadow-lg alert alert-success">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0 w-6 h-6 stroke-current"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>You have already registered!</span>
                    </div>
                  </div>
                </>
              )}

              {!user && !code && !error && publicKey && (
                <>
                  <h2 className="mb-3">2. Connect Discord</h2>
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
                    <>
                      <h3>3. Sign message</h3>
                      <button
                        className="mt-2 btn btn-outline"
                        onClick={() => sendTransaction()}
                      >
                        Sign Message
                      </button>
                    </>
                  )}
                  {user && publicKey && txLoading === "loading" && (
                    <>
                      <button disabled className="btn loading"></button>
                    </>
                  )}
                  {user && publicKey && txLoading === "loaded" && (
                    <>
                      <div className="shadow-lg alert alert-success">
                        Success! We got your address
                      </div>
                    </>
                  )}
                </>
              }
            </div>
          </div>
          <br />
          {/* <WalletMultiButton /> */}
        </div>
      </main>
    </div>
  );
}
