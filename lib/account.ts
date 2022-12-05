import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { getAccountZoneIndex } from "./aws_r53Client";

export async function getAccountIdFromAccessKey(access_key: string, secret_key: string): Promise<string> {
  const clientConfig = {
    region: 'us-east-1',
    credentials: {
      accessKeyId: access_key,
      secretAccessKey: secret_key,
    }
  };
  const sts = new STSClient(clientConfig);
  return (await sts.send(new GetCallerIdentityCommand({}))).Account as string;
}

export async function getAccountIdFromZoneId(zone_id: string): Promise<string | undefined> {
  const index = await getAccountZoneIndex();

  for (const [id, zones] of Object.entries(index)) {
    if (Object.keys(zones).includes(zone_id)) {
      return id;
    }
  }

  return undefined;
}