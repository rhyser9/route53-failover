import { getHealthChecks, HealthChecksIndex } from "@lib/aws_r53Client";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthChecksIndex>
) {
  const account_id = req.query.account_id as string;
  const account = await prisma.account.findUnique({ where: { id: account_id } });
  if (account === null) {
    res.status(404).end();
    return;
  }

  switch (req.method) {
    case 'GET':
      const healthChecks = await getHealthChecks(account_id, true);
      res.status(200).json(healthChecks);
      return;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
  }
}