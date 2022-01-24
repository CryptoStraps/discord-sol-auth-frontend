// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import fetch from "node-fetch";
import { URLSearchParams } from "url";

const API_ENDPOINT = "https://discord.com/api/v8";
const CLIENT_ID = "935204697030131712";
const CLIENT_SECRET = "75NFVLpIVvNsQcM4Pqqx4RmTMMOmrIGI";
const REDIRECT_URI = "https://sol-auth.vercel.app";


export default async function handler(req, res) {
  const { code } = req.query;
  const data = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
  };
  const params = new URLSearchParams(data);
  const resp = await fetch(`${API_ENDPOINT}/oauth2/token`, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).then((res) => res.json());
  res.status(200).send(resp);
}
