import { HealthCheckObservation } from "@aws-sdk/client-route-53";
import { getHealthCheckObservations } from "@lib/aws_r53Client";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckObservation[]>
) {
  const account_id = req.query.account_id as string;
  const account = await prisma.account.findUnique({ where: { id: account_id } });
  if (account === null) {
    res.status(404).end();
    return;
  }

  const health_check_id = req.query.health_check_id as string;

  console.log('hit route');
  switch (req.method) {
    case 'GET':
      const healthCheckObservations = await getHealthCheckObservations(account_id, health_check_id, true);
      res.status(200).json(healthCheckObservations);
      return;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
  }
}