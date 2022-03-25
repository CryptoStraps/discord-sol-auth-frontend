import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Head from "next/head";
import { useEffect, useReducer, useRef } from "react";
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
import { AMMO, MEMO } from "../util/ids";

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

  const initState: {
    status: string;
    txLoading: boolean;
    balance: number;
    balanceLoading: boolean;
    error?: string;
    nfts?: ParsedNFTAccount[];
    nftsLoading?: boolean;
  } = {
    status: "idle",
    txLoading: false,
    balance: 0,
    balanceLoading: true,
    nfts: [],
    nftsLoading: true,
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
        default:
          throw new Error("unsupported action type given on BurnNFTs reducer");
      }
    },
    initState
  );
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();

  const sned = async (
    { selectedMint }: { selectedMint: string } = { selectedMint: "foo" }
  ) => {
    if (publicKey) {
      dispatch({ type: "txLoading", payload: { txLoading: true } });
      const ata = await getAssociatedTokenAddress(
        AMMO,
        new PublicKey("gunzzzqPKDF4ZpURLdJF9L6X1iCtKtZxkzoCU9MhGav")
      );
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
          12 * LAMPORTS_PER_SOL,
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
          3 * LAMPORTS_PER_SOL,
          9
        )
      );

      let txId;
      txId = await sendTransaction(tx, connection);

      dispatch({ type: "txLoading", payload: { txLoading: false } });
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
        const nfts: ParsedNFTAccount[] = await (
          await getParsedNftAccountsByOwner({ publicAddress })
        ).filter((n) =>
          n.data.creators.find(
            (c) =>
              c.address === "AtqMwB15umxEDsebekamLrHPaLBc3k8ihwrVVg6ytCN4" &&
              !!c.verified
          )
        );
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
  return (
    <div>
      <Head>
        <title>Loot Reveal</title>
        <meta name="description" content="Unlock your loot crate with $AMMO!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div className="my-8 text-center container mx-auto">
          <div className="bg-black card mb-8">
            <div className="text-center card-body">
              <div className="flex justify-center items-center shadow-lg">
                <Image src="/logogo.png" alt="Logo" width={192} height={125} />
              </div>

              <WalletMultiButton />
            </div>
          </div>

          <div className="">
            {!!state.nftsLoading && (
              <span className="btn btn-disabled btn-ghost loading"></span>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {!state.nftsLoading &&
                state.nfts?.map((nft) => (
                  <div className="card border">
                    <div className="card-body">
                      <div className="card-title">
                        Loot {nft.mint.slice(0, 6)}
                      </div>
                      <video
                        src={nft.offchainMetadata.animation_url}
                        poster={nft.offchainMetadata.image}
                      />
                      <div className="card-actions">
                        <button
                          className={
                            `inline-block mx-auto ` +
                            (state.balanceLoading
                              ? "btn btn-primary btn-disabled loading"
                              : "btn btn-primary")
                          }
                          onClick={() => sned()}
                        >
                          {!state.balanceLoading && <>Unlock!</>}
                        </button>
                      </div>
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
