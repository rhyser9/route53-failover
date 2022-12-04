import { ResourceRecordSet } from "@aws-sdk/client-route-53";
import { getRecords } from "@lib/aws_r53Client";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResourceRecordSet[]>
) {
  const account_id = req.query.account_id as string;
  const account = await prisma.account.findUnique({ where: { id: account_id } });
  if (account === null) {
    res.status(404).end();
    return;
  }

  const zone_id = req.query.zone_id as string;

  switch (req.method) {
    case 'GET':
      const resourceRecords = await getRecords(account_id, zone_id, true);
      res.status(200).json(resourceRecords);
      return;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
  }
}