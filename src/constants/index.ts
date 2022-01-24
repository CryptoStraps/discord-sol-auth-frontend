import { Cluster } from "@solana/web3.js";
import { ENV as ENVChainId } from "@solana/spl-token-registry";

require('dotenv').config()

// Endpoints, connection
export const ENV: Cluster = (process.env.NEXT_PUBLIC_CLUSTER as Cluster) || "mainnet-beta";
export const CHAIN_ID = ENV === 'mainnet-beta'
    ? ENVChainId.MainnetBeta
    : ENV === 'devnet'
        ? ENVChainId.Devnet
        : ENV === 'testnet'
            ? ENVChainId.Testnet
            : ENVChainId.MainnetBeta
export const SOLANA_RPC_ENDPOINT = ENV === "devnet"
    ? 'https://api.devnet.solana.com'
    : "https://solana-api.projectserum.com";
