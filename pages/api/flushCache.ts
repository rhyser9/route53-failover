import type { NextApiRequest, NextApiResponse } from "next";
import { flushCache } from "@lib/aws_r53Client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  flushCache();
  res.status(200).end();
}