import { getHostedZones, HostedZonesIndex } from "@lib/aws_r53Client";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

type AccountZonesIndex = { [key: string]: HostedZonesIndex; };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountZonesIndex>
) {
  switch (req.method) {
    case 'GET':
      const accounts = await prisma.account.findMany();
      const account_ids = accounts.map(account => account.id);

      var promises: Promise<HostedZonesIndex>[] = [];
      account_ids.forEach(account_id => {
        promises.push(getHostedZones(account_id, true));
      });

      const resultsArr = await Promise.all(promises);
      const results: AccountZonesIndex = account_ids.reduce((obj, account_id, i) => ({ ...obj, [account_id]: resultsArr[i] }), {});

      res.status(200).json(results);
      return;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
  }
}