import { Creator } from "@nfteyez/sol-rayz/dist/config/metaplex";
import { PublicKey } from "@solana/web3.js";

export const AMMO = new PublicKey(
  "EEhosSQvC2yVDRXRGpkonGFF2WNjtUdzb48GV8TSmhfA"
);
export const MEMO = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
export const findVerifiedCreator = (c: Creator) =>
  c.address === "AtqMwB15umxEDsebekamLrHPaLBc3k8ihwrVVg6ytCN4" && !!c.verified;
export const DESTINATION = new PublicKey("gunzzzqPKDF4ZpURLdJF9L6X1iCtKtZxkzoCU9MhGav");