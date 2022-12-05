import type { NextApiRequest, NextApiResponse } from "next";
import { Site } from "@prisma/client";
import prisma from "@lib/prisma";
import { getHostedZones, getRecords } from "@lib/aws_r53Client";
import { getAccountIdFromZoneId } from "@lib/account";
import { Prisma } from "@prisma/client";
import { logActivity, logSiteActivity } from "@lib/activitylog";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Site[]>
) {
  const sites: Site[] = await prisma.site.findMany({});

  switch (req.method) {
    case 'GET': {
      res.status(200).json(sites);
      return;
    }
    case 'POST': {
      // TODO: Validate / sanitize input
      const data = req.body;
      const zone_id = data.zone_id;
      const name = data.name;
      const fqdn = data.fqdn;
      const notif_email = data.notif_email;
      const notif_teams = data.notif_teams;
      const monitoring_link = data.monitoring_link;

      // TODO: validate basic fields
      // TODO: make sure fqdn has trailing dot


      // check unique site
      const site = sites.find(site => site.name === name || site.fqdn === fqdn);
      if (site !== undefined) {
        res.status(409).end(`Site '${site.name}' (${site.fqdn}) already exists`);
        return;
      }

      const account_id = await getAccountIdFromZoneId(zone_id);
      if (account_id === undefined) {
        res.status(500).end(`Couldn't find parent account for zone ID ${zone_id}`);
        return;
      }

      const zone = (await getHostedZones(account_id))[zone_id];
      if (zone === undefined) {
        res.status(400).end(`Invalid hosted zone ID ${zone_id}`);
        return;
      }

      // Check that A / AAAA / CNAME records exist in AWS
      // TODO: check that the records are weighted? via `if typeof record.Weight !== undefined`
      const records = await getRecords(account_id, zone_id);
      const filteredRecordNames = records.reduce((names, record) => {
        if (["A", "AAAA", "CNAME"].includes(record.Type ?? "")) names.push(record.Name ?? "");
        return names;
      }, [] as string[]);

      if (!filteredRecordNames.includes(fqdn)) {
        res.status(400).end(`No DNS records exist in AWS for ${fqdn}`);
        return;
      }

      // insert site into database
      try {
        const newSiteInput: Prisma.SiteCreateInput = {
          name: name,
          fqdn: fqdn,
          zone_id: zone_id,
          account: {
            connect: {
              id: account_id
            }
          },
          notif_email: notif_email,
          notif_teams: notif_teams,
          monitoring_link: monitoring_link,
          enabled: true
        };
        const newSite = await prisma.site.create({
          data: newSiteInput
        });

        res.setHeader('Location', `/api/sites/${newSite.id}`);
        res.status(201).json([newSite]);
        logSiteActivity(newSite.id, "TODO", "CREATE", `Created new site config for ${newSite.fqdn} (${newSite.name}) in zone ${newSite.zone_id}`);
        return;

      } catch (e) {
        console.log(e);
        res.status(500).end(`Error inserting new site ${fqdn} (${name}) into database`);
        logActivity("TODO", "ERROR", `Error inserting new site ${fqdn} (${name}) into database`);
        return;
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} not allowed`);
      return;
  }
}