import type { NextApiRequest, NextApiResponse } from "next";
import { AccountZonesIndex, getAccountZoneIndex } from "@lib/aws_r53Client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountZonesIndex>
) {
  switch (req.method) {
    case 'GET':
      const zones = await getAccountZoneIndex();
      res.status(200).json(zones);
      return;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
  }
}