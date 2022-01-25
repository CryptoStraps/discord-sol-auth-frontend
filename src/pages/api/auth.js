// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import logToDiscord from "./_discord";

const API_ENDPOINT = process.env.DISCORD_API_ENDPOINT;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

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

  const me = await fetch(`${API_ENDPOINT}/users/@me`, {
    headers: { Authorization: `Bearer ${resp.access_token}` },
  }).then((res) => res.json());

  if (me && me.username) {
    logToDiscord(`${me.username}#${me.discriminator}`);
    res.send(resp);
  }
}
