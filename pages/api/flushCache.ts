import type { NextApiRequest, NextApiResponse } from "next";
import { flushCache } from "@lib/aws_r53Client";
import { logActivity } from "@lib/activitylog";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  flushCache();
  res.status(200).end();
  logActivity("TODO", "FLUSH", "AWS API Cache Cleared");
}