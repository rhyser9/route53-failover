import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, Account } from '@prisma/client';
import prisma from '@lib/prisma';
import { STSServiceException } from '@aws-sdk/client-sts';
import { getAccountIdFromAccessKey } from '@lib/account';
import { logActivity } from '@lib/activitylog';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account[]>
) {
  const accounts: Account[] = await prisma.account.findMany({});

  switch (req.method) {
    case 'GET': {
      res.status(200).json(accounts);
      return;
    }
    case 'POST': {
      // TODO: validate / type check request parameters

      const data = req.body;
      const account_name = data.name as string;
      const access_key = data.access_key as string;
      const secret_key = data.secret_key as string;

      // check unique account name
      var account = accounts.find(account => account.name === account_name);
      if (account !== undefined) {
        res.status(409).end(`Account ${account.name} already exists`);
        return;
      }

      // look up account id from AWS via STS:GetCallerIdentity
      var account_id: string;
      try {
        account_id = await getAccountIdFromAccessKey(access_key, secret_key);
      } catch (e) {
        if (e instanceof STSServiceException && e.$metadata.httpStatusCode === 403) {
          res.status(403).end(`Invalid AWS credentials for access key ${access_key}`);
        } else {
          res.status(500).end(`Error retrieving account ID from AWS with access key ${access_key}`);
        }
        console.log(e);
        return;
      }

      // check unique account id
      var account = accounts.find(account => account.id === account_id);
      if (account !== undefined) {
        res.status(409).end(`Account ${account.id} (${account.name}) already exists`);
        return;
      }

      // insert account into database
      try {
        const newAccountInput: Prisma.AccountCreateInput = {
          id: account_id,
          name: account_name,
          access_key: access_key,
          credential: {
            create: {
              secret_key: secret_key,
            }
          }
        };
        const newAccount = await prisma.account.create({
          data: newAccountInput
        });

        res.setHeader('Location', `/api/accounts/${account_id}`);
        res.status(201).json([newAccount]);
        logActivity("TODO", "CREATE", `Created new account config for ${newAccount.id} (${newAccount.name})`);
        return;

      } catch (e) {
        console.log(e);
        res.status(500).end(`Error inserting account ${account_id} (${account_name}) into database`);
        logActivity("TODO", "ERROR", `Error inserting account ${account_id} (${account_name}) into database`);
        return;
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} not allowed`);
      return;
  }
}
