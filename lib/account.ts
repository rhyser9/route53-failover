import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

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