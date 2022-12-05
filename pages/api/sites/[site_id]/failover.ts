import type { NextApiRequest, NextApiResponse } from "next";
import { logSiteActivity } from "@lib/activitylog";
import prisma from "@lib/prisma";
import { getRecordsForSite, updateRecords } from "@lib/aws_r53Client";
import { Change, ChangeResourceRecordSetsCommandInput } from "@aws-sdk/client-route-53";

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
    /*
    expect: {
      "dest": string (AWS SetIdentifier)
      "comment": string
    }
    */

    case 'POST': {
      // TODO: sanitize / validate input
      var dest = String(req.body.dest);
      var comment = String(req.body.comment);

      var records = await getRecordsForSite(site.account_id, site.zone_id, site_id);
      var records = records.filter(record => record.Weight !== undefined && ["A", "AAAA", "CNAME"].includes(record.Type ?? ""));
      console.log(records);
      if (!records.length) {
        res.status(400).end(`No weighted failover records exist in AWS for site ${site.fqdn} (${site.name})`);
        logSiteActivity(site_id, "TODO", "ERROR-FAILOVER", `No weighted failover records exist in AWS for site ${site.fqdn} (${site.name})`);
        return;
      }
      if (!records.some(record => record.SetIdentifier == dest)) {
        res.status(400).end(`Invalid failover destination '${dest}' for site ${site.fqdn} (${site.name})`);
        return;
      }

      logSiteActivity(site_id, "TODO", "FAILOVER", `Initiating failover of ${site.fqdn} (${site.name}), comment '${comment}'`);

      var failoverInput: ChangeResourceRecordSetsCommandInput = {
        HostedZoneId: site.zone_id,
        ChangeBatch: {
          Comment: comment,
          Changes: []
        }
      };

      for (const record of records) {
        var changeInput: Change = {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: record.Name,
            Type: record.Type,
            SetIdentifier: record.SetIdentifier!,
            Weight: (dest === record.SetIdentifier ? 100 : 0),
            ResourceRecords: record.ResourceRecords!,
          }
        };

        if (record.HealthCheckId !== undefined) {
          changeInput.ResourceRecordSet!.HealthCheckId = record.HealthCheckId;
        }
        // TTL does not exist on AWS ALIAS records
        if (record.TTL !== undefined) {
          changeInput.ResourceRecordSet!.TTL = record.TTL;
        }

        failoverInput.ChangeBatch?.Changes?.push(changeInput);
      }

      try {
        const output = await updateRecords(site.account_id, failoverInput);
        res.status(200).json(output);
        logSiteActivity(site_id, "TODO", "FAILOVER", `Failover complete for site ${site.fqdn} (${site.name})`);
        return;
        // TODO: check change result
      } catch (e) {
        console.log(`Failover failed for site ${site.fqdn} (${site.name})`);
        console.log(e);
        res.status(500).end(`Failover failed for site ${site.fqdn} (${site.name})`);
        logSiteActivity(site_id, "TODO", "ERROR-FAILOVER", `Failover failed for site ${site.fqdn} (${site.name}), error ${e}`);
        return;

      }
    }
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} not allowed`);
      return;
  }
}