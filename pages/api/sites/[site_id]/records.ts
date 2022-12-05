import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getRecordsForSite } from "@lib/aws_r53Client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const site_id = Number(req.query.site_id as string);
  const site = await prisma.site.findUnique({ where: { id: site_id } });
  if (site === null) {
    res.status(404).end();
    return;
  }

  switch (req.method) {

    case 'GET': {
      const records = await getRecordsForSite(site.account_id, site.zone_id, site_id);
      res.status(200).json(records);
      return;
    }
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} not allowed`);
      return;
  }
}