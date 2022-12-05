import { GetHealthCheckStatusCommand, HealthCheck, HealthCheckObservation, HostedZone, ListHealthChecksCommand, ListHostedZonesCommand, ListResourceRecordSetsCommand, ResourceRecordSet, Route53Client } from "@aws-sdk/client-route-53";
import NodeCache from "node-cache";
import prisma from "./prisma";

export type { HostedZone };
export type HostedZonesIndex = { [key: string]: HostedZone; };
export type HealthChecksIndex = { [key: string]: HealthCheck; };
export type AccountZonesIndex = { [key: string]: HostedZonesIndex; };

// TODO: extract this to env / config / settings UI / somewhere else
const TTL_ZONES = 15; //300;
const TTL_RECORDS = 15; //120;
const TTL_HEALTHCHECKS = 15; //120;
const TTL_HEALTHCHECKSTATUS = 15; //60;

const zoneCache = new NodeCache({ stdTTL: TTL_ZONES });
const recordCache = new NodeCache({ stdTTL: TTL_RECORDS });
const healthCache = new NodeCache({ stdTTL: TTL_HEALTHCHECKS });
const statusCache = new NodeCache({ stdTTL: TTL_HEALTHCHECKSTATUS });

export function flushCache() {
  zoneCache.flushAll();
  recordCache.flushAll();
  healthCache.flushAll();
  statusCache.flushAll();
}

export async function getHostedZones(account_id: string, forceRefresh: boolean = false): Promise<HostedZonesIndex> {

  if (zoneCache.has(account_id) && !forceRefresh) {
    return zoneCache.get(account_id) as HostedZonesIndex;
  }

  const account = await prisma.account.findUnique({ include: { credential: true }, where: { id: account_id } });
  if (account === null) {
    throw new Error(`Account ${account_id} does not exist`);
  }
  if (account.credential === null) {
    throw new Error(`Account ${account_id} is missing credentials`);
  }

  const clientConfig = {
    region: "us-east-1",
    credentials: {
      accessKeyId: account.access_key,
      secretAccessKey: account.credential.secret_key
    }
  };

  const r53 = new Route53Client(clientConfig);
  var result = await r53.send(new ListHostedZonesCommand({ MaxItems: 500 }));
  if (result.IsTruncated) {
    throw new Error(`Too many hosted zones in account ${account_id}, please implement pagination`);
  }
  if (result.HostedZones === undefined) {
    console.log(`AWS hosted zones returned undefined for account ${account_id} instead of []`);
    return {};
  }

  const indexedZones: HostedZonesIndex = result.HostedZones.reduce((obj, zone) => ({ ...obj, [(zone.Id as string).replace("/hostedzone/", "")]: zone }), {});
  zoneCache.set(account_id, indexedZones);
  return indexedZones;
}

export async function getAccountZoneIndex(forceRefresh: boolean = false): Promise<AccountZonesIndex> {
  const accounts = await prisma.account.findMany();
  const account_ids = accounts.map(account => account.id);

  var promises: Promise<HostedZonesIndex>[] = [];
  account_ids.forEach(account_id => {
    promises.push(getHostedZones(account_id, true));
  });

  const resultsArr = await Promise.all(promises);
  const results: AccountZonesIndex = account_ids.reduce((obj, account_id, i) => ({ ...obj, [account_id]: resultsArr[i] }), {});

  return results;
}

export async function getRecords(account_id: string, zone_id: string, forceRefresh: boolean = false): Promise<ResourceRecordSet[]> {
  if (recordCache.has(zone_id) && !forceRefresh) {
    return recordCache.get(zone_id) as ResourceRecordSet[];
  }

  const account = await prisma.account.findUnique({ include: { credential: true }, where: { id: account_id } });
  if (account === null) {
    throw new Error(`Account ${account_id} does not exist`);
  }
  if (account.credential === null) {
    throw new Error(`Account ${account_id} is missing credentials`);
  }

  const clientConfig = {
    region: "us-east-1",
    credentials: {
      accessKeyId: account.access_key,
      secretAccessKey: account.credential.secret_key
    }
  };

  const r53 = new Route53Client(clientConfig);
  var result = await r53.send(new ListResourceRecordSetsCommand({ HostedZoneId: zone_id, MaxItems: 1000 }));
  if (result.IsTruncated) {
    throw new Error(`Too many resource records in account ${account_id} hosted zone ${zone_id}, please implement pagination`);
  }
  if (result.ResourceRecordSets === undefined) {
    console.log(`AWS resource records returned undefined for account ${account_id} hosted zone ${zone_id} instead of []`);
    return [];
  }

  recordCache.set(zone_id, result.ResourceRecordSets);
  return result.ResourceRecordSets;
}

export async function getHealthChecks(account_id: string, forceRefresh: boolean = false): Promise<HealthChecksIndex> {
  if (healthCache.has(account_id) && !forceRefresh) {
    return healthCache.get(account_id) as HealthChecksIndex;
  }

  const account = await prisma.account.findUnique({ include: { credential: true }, where: { id: account_id } });
  if (account === null) {
    throw new Error(`Account ${account_id} does not exist`);
  }
  if (account.credential === null) {
    throw new Error(`Account ${account_id} is missing credentials`);
  }

  const clientConfig = {
    region: "us-east-1",
    credentials: {
      accessKeyId: account.access_key,
      secretAccessKey: account.credential.secret_key
    }
  };

  const r53 = new Route53Client(clientConfig);
  var result = await r53.send(new ListHealthChecksCommand({ MaxItems: 1000 }));
  if (result.IsTruncated) {
    throw new Error(`Too many health checks in account ${account_id}, please implement pagination`);
  }
  if (result.HealthChecks === undefined) {
    console.log(`AWS health checks returned undefined for account ${account_id} instead of []`);
    return {};
  }

  const indexedHealthChecks: HealthChecksIndex = result.HealthChecks.reduce((obj, check) => ({ ...obj, [(check.Id as string).replace("/hostedzone/", "")]: check }), {});
  healthCache.set(account_id, indexedHealthChecks);
  return indexedHealthChecks;
}

export async function getHealthCheckObservations(account_id: string, health_check_id: string, forceRefresh: boolean = false): Promise<HealthCheckObservation[]> {
  if (statusCache.has(health_check_id) && !forceRefresh) {
    return statusCache.get(health_check_id) as ResourceRecordSet[];
  }

  const account = await prisma.account.findUnique({ include: { credential: true }, where: { id: account_id } });
  if (account === null) {
    throw new Error(`Account ${account_id} does not exist`);
  }
  if (account.credential === null) {
    throw new Error(`Account ${account_id} is missing credentials`);
  }

  const clientConfig = {
    region: "us-east-1",
    credentials: {
      accessKeyId: account.access_key,
      secretAccessKey: account.credential.secret_key
    }
  };

  const r53 = new Route53Client(clientConfig);
  var result = await r53.send(new GetHealthCheckStatusCommand({ HealthCheckId: health_check_id }));
  if (result.HealthCheckObservations === undefined) {
    console.log(`AWS health check observations returned undefined for account ${account_id} health check ${health_check_id} instead of []`);
    return [];
  }

  statusCache.set(health_check_id, result.HealthCheckObservations);
  return result.HealthCheckObservations;
}