import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Head from "next/head";
import { useContext, useEffect, useReducer, useRef } from "react";
import Image from "next/image";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  resolveToWalletAddress,
  getParsedNftAccountsByOwner,
} from "@nfteyez/sol-rayz";
import { MetadataKey } from "@nfteyez/sol-rayz/dist/config/metaplex";
import { sleep } from "../util/sleep";
import { AMMO, DESTINATION, findVerifiedCreator, MEMO } from "../util/ids";
import { ModalContext } from "../contexts/ModalProvider";
const initialMap = new Map();
// initialMap.set("95Cv22gBSi6h38sLq5v1CiAbv4yh5UyH8uaPXtyKi56j", "bar");

interface ParsedNFTAccount {
  mint: string;
  updateAuthority: string;
  data: {
    creators: any[];
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
  };
  key: MetadataKey;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce: number;
  masterEdition?: string;
  edition?: string;
  offchainMetadata?: any;
}

export default function Home() {
  const { publicKey } = useWallet();
  const ataRef = useRef<PublicKey>();
  const playingVideo = useRef<HTMLVideoElement>();
  const { setModalState } = useContext(ModalContext);

  const initState: {
    status: string;
    txLoading: boolean;
    balance: number;
    balanceLoading: boolean;
    error?: string;
    nfts?: ParsedNFTAccount[];
    nftsLoading?: boolean;
    txMap: Map<string, string>;
  } = {
    status: "idle",
    txLoading: false,
    balance: 0,
    balanceLoading: true,
    nfts: [],
    nftsLoading: false,
    txMap: initialMap,
  };
  const [state, dispatch] = useReducer(
    (
      state: typeof initState,
      action:
        | { type: "started"; payload?: null }
        | { type: "error"; payload?: { error?: string } }
        | { type: "txLoading"; payload?: { txLoading: boolean } }
        | { type: "balance"; payload: { balance: number } }
        | { type: "balanceLoading"; payload: { balanceLoading: boolean } }
        | { type: "nfts"; payload: { nfts: ParsedNFTAccount[] } }
        | { type: "nftsLoading"; payload: { nftsLoading: boolean } }
        | { type: "txMap"; payload: { txMap: Map<string, string> } }
    ) => {
      switch (action.type) {
        case "started":
          return { ...state, status: "pending" };
        case "error":
          return { ...state, status: "error", error: action.payload?.error };
        case "txLoading":
          return { ...state, txLoading: !!action.payload?.txLoading };
        case "balanceLoading":
          return { ...state, balanceLoading: !!action.payload?.balanceLoading };
        case "balance":
          return { ...state, balance: action.payload?.balance };
        case "nfts":
          return { ...state, nfts: action.payload?.nfts };
        case "nftsLoading":
          return { ...state, nftsLoading: action.payload?.nftsLoading };
        case "txMap":
          return { ...state, txMap: action.payload?.txMap };
        default:
          throw new Error("unsupported action type given on BurnNFTs reducer");
      }
    },
    initState
  );
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();

  useEffect(() => {
    if (!publicKey) {
      dispatch({ type: "nfts", payload: { nfts: [] } });
      dispatch({ type: "balance", payload: { balance: 0 } });
    }
  }, [publicKey]);

  const sned = async ({ selectedMint }: { selectedMint: string }) => {
    if (publicKey) {
      dispatch({ type: "txLoading", payload: { txLoading: true } });
      const ata = await getAssociatedTokenAddress(AMMO, DESTINATION);
      let blockhash;
      while (!blockhash) {
        try {
          blockhash = (await connection.getRecentBlockhash()).blockhash;
        } catch (e) {
          console.error(e);
          await sleep(500);
        }
      }

      const tx = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        createBurnCheckedInstruction(
          ataRef.current!,
          AMMO,
          publicKey,
          1200 * LAMPORTS_PER_SOL,
          9
        ),
        new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(selectedMint, "utf-8"),
          programId: MEMO,
        }),
        createTransferCheckedInstruction(
          ataRef.current!,
          AMMO,
          ata,
          publicKey,
          300 * LAMPORTS_PER_SOL,
          9
        )
      );

      const txId = await sendTransaction(tx, connection);
      const map = new Map(state.txMap);
      map.set(selectedMint, txId);

      dispatch({ type: "txMap", payload: { txMap: map } });
      dispatch({ type: "txLoading", payload: { txLoading: false } });
      dispatch({ type: "balance", payload: { balance: state.balance - 1500 } });
      setModalState!({
        open: true,
        message: `Request to unlock has been sent!
https://solscan.io/tx/${txId}`,
      });
    }
  };

  useEffect(() => {
    (async () => {
      if (publicKey) {
        dispatch({
          type: "nftsLoading",
          payload: { nftsLoading: true },
        });

        const publicAddress = await resolveToWalletAddress({
          text: publicKey.toBase58(),
          connection,
        });

        const nfts: ParsedNFTAccount[] = (
          await getParsedNftAccountsByOwner({ publicAddress, connection })
        ).filter((n) => n.data.creators.find(findVerifiedCreator));

        const offchainMetadata = await Promise.all(
          nfts.map((n) => fetch(n.data.uri).then((res) => res.json()))
        );
        nfts.forEach((nft, i) => (nft.offchainMetadata = offchainMetadata[i]));
        dispatch({ type: "nfts", payload: { nfts } });
        dispatch({
          type: "nftsLoading",
          payload: { nftsLoading: false },
        });
      }
    })();
  }, [publicKey]);

  useEffect(() => {
    (async () => {
      if (publicKey) {
        dispatch({ type: "balanceLoading", payload: { balanceLoading: true } });
        const ata = await getAssociatedTokenAddress(AMMO, publicKey);
        ataRef.current = ata;
        const balance = await connection.getTokenAccountBalance(ata);
        dispatch({
          type: "balance",
          payload: { balance: balance.value.uiAmount || 0 },
        });
        dispatch({
          type: "balanceLoading",
          payload: { balanceLoading: false },
        });
      }
    })();
  }, [publicKey]);

  const onVideoClick = (e: any) => {
    playingVideo.current?.pause();
    if (e.target instanceof HTMLVideoElement) {
      playingVideo.current = e.target;
      (e.target as HTMLVideoElement).play();
    }
  };
  return (
    <div>
      <Head>
        <title>Loot Reveal</title>
        <meta name="description" content="Unlock your loot crate with $AMMO!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div className="my-8 text-center container mx-auto px-6 relative">
          <div>
            <div className="bg-black mb-8 w-full">
              <div>
                <div className="flex justify-center items-center shadow-lg">
                  <Image
                    src="/logogo.png"
                    alt="Logo"
                    width={192}
                    height={125}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <WalletMultiButton />
                  {publicKey && (
                    <div>
                      <div className=" ml-auto self-end border-4 rounded-full bg-white border-white text-black flex flex-row justify-end items-center">
                        <div>
                          <div className="text-right mr-4 mb-1">Balance</div>
                          <strong className="mx-4 w-full text-center">
                            {state.balance.toFixed(2)}
                          </strong>
                        </div>
                        <img
                          src="https://arweave.net/rjP_BdMqFsXBWoInFYuVNDdqLzW1xo82egb74WRl3Hc"
                          className="w-16 rounded-full shadow"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="">
            {!!state.nftsLoading && (
              <span className="btn btn-disabled btn-ghost loading"></span>
            )}
            {!state.nftsLoading && publicKey && !state.nfts?.length && (
              <h2 className="text-2xl text-center">
                No Loot boxes in your wallet.
              </h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {!state.nftsLoading &&
                state.nfts?.map((nft) => (
                  <div
                    key={nft.mint}
                    className="card border border-gray-600 overflow-hidden"
                  >
                    <div className="card-body p-0 overflow-hidden">
                      <div className="relative">
                        <span className="badge bg-black text-xl py-4 absolute top-0 left-0 right-0 rounded-tl-none rounded-bl-none rounded-tr-none rounded-br-2xl px-10 shadow">
                          {nft.mint.slice(0, 6).toUpperCase()}
                        </span>
                        <video
                          src={nft.offchainMetadata.animation_url}
                          poster={nft.offchainMetadata.image}
                          id={`video-${nft.mint}`}
                          className="cursor-pointer"
                          onMouseEnter={(e) => onVideoClick(e)}
                        />
                        {state.txMap.has(nft.mint) && (
                          <div className="absolute inset-0 flex justify-center items-center">
                            <div className="absolute inset-0 bg-gray-800 opacity-50"></div>
                            <svg
                              id="hour-glass"
                              width="73px"
                              height="88px"
                              viewBox="0 0 73 88"
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                            >
                              <g id="hourglass">
                                <path
                                  d="M63.8761664,86 C63.9491436,84.74063 64,83.4707791 64,82.1818182 C64,65.2090455 57.5148507,50.6237818 48.20041,44 C57.5148507,37.3762182 64,22.7909545 64,5.81818182 C64,4.52922091 63.9491436,3.25937 63.8761664,2 L10.1238336,2 C10.0508564,3.25937 10,4.52922091 10,5.81818182 C10,22.7909545 16.4851493,37.3762182 25.79959,44 C16.4851493,50.6237818 10,65.2090455 10,82.1818182 C10,83.4707791 10.0508564,84.74063 10.1238336,86 L63.8761664,86 Z"
                                  id="glass"
                                  fill="#ECF1F6"
                                ></path>
                                <rect
                                  id="top-plate"
                                  fill="#4D4544"
                                  x="0"
                                  y="0"
                                  width="74"
                                  height="8"
                                  rx="2"
                                ></rect>
                                <rect
                                  id="bottom-plate"
                                  fill="#4D4544"
                                  x="0"
                                  y="80"
                                  width="74"
                                  height="8"
                                  rx="2"
                                ></rect>

                                <g id="top-sand" transform="translate(18, 21)">
                                  <clipPath id="top-clip-path" fill="white">
                                    <rect
                                      x="0"
                                      y="0"
                                      width="38"
                                      height="21"
                                    ></rect>
                                  </clipPath>

                                  <path
                                    fill="#F5A623"
                                    clip-path="url(#top-clip-path)"
                                    d="M38,0 C36.218769,7.51704545 24.818769,21 19,21 C13.418769,21 1.9,7.63636364 0,0 L38,0 Z"
                                  ></path>
                                </g>

                                <g
                                  id="bottom-sand"
                                  transform="translate(18, 55)"
                                >
                                  <clipPath id="bottom-clip-path" fill="white">
                                    <rect
                                      x="0"
                                      y="0"
                                      width="38"
                                      height="21"
                                    ></rect>
                                  </clipPath>

                                  <g clip-path="url(#bottom-clip-path)">
                                    <path
                                      fill="#F5A623"
                                      d="M0,21 L38,21 C36.1,13.3636364 24.581231,0 19,0 C13.181231,0 1.781231,13.4829545 0,21 Z"
                                    ></path>
                                  </g>
                                </g>
                              </g>
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        className={
                          `inline-block shadow mx-auto w-full rounded-tl-none rounded-tr-none no-animation ` +
                          (state.balanceLoading
                            ? "btn btn-disabled loading "
                            : "btn ")
                        }
                        onClick={() => sned({ selectedMint: nft.mint })}
                        disabled={state.txMap.has(nft.mint)}
                      >
                        {!state.balanceLoading && (
                          <div className="flex items-center justify-center">
                            <span className="mr-3">
                              <svg
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 50 50"
                                width="24px"
                                height="24px"
                              >
                                <path d="M 25 3 C 18.363281 3 13 8.363281 13 15 L 13 20 L 9 20 C 7.300781 20 6 21.300781 6 23 L 6 47 C 6 48.699219 7.300781 50 9 50 L 41 50 C 42.699219 50 44 48.699219 44 47 L 44 23 C 44 21.300781 42.699219 20 41 20 L 37 20 L 37 15 C 37 8.363281 31.636719 3 25 3 Z M 25 5 C 30.566406 5 35 9.433594 35 15 L 35 20 L 15 20 L 15 15 C 15 9.433594 19.433594 5 25 5 Z M 25 30 C 26.699219 30 28 31.300781 28 33 C 28 33.898438 27.601563 34.6875 27 35.1875 L 27 38 C 27 39.101563 26.101563 40 25 40 C 23.898438 40 23 39.101563 23 38 L 23 35.1875 C 22.398438 34.6875 22 33.898438 22 33 C 22 31.300781 23.300781 30 25 30 Z" />
                              </svg>
                            </span>
                            <span
                              className="flex gap-1 justify-center items-center"
                              style={{ flexWrap: "wrap" }}
                            >
                              {!state.txMap.has(nft.mint) && (
                                <>
                                  <span> Unlock!</span>
                                  <span className="badge">1500 $AMMO</span>
                                </>
                              )}
                              {state.txMap.has(nft.mint) && (
                                <span>Unlocking...</span>
                              )}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <br />
        </div>
      </main>
    </div>
  );
}
