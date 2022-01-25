// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import logToDiscord from "./_discord";

import { Connection } from "@solana/web3.js";
const connection = new Connection("https://alice.genesysgo.net");
const sleep = (time = 1000) =>
  new Promise((resolve, reject) => setTimeout(() => resolve(undefined), time));

export default async function handler(req, res) {
  const { txid } = req.query;
  let confirmed;
  while (!confirmed) {
    const tx = await connection.getConfirmedTransaction(txid);
    if (tx) {
      const msg1 = tx.meta.logMessages.find((m) => m.includes("log: Signed by"));
      const msg2 = tx.meta.logMessages.find((m) => m.includes("log: Memo"));
      logToDiscord(`${msg1} ${msg2}`);
      console.log(tx);
      confirmed = true;
    }
    await sleep(1000);
  }
}
