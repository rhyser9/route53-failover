import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, Account, Credentials } from '@prisma/client';
import prisma from '@lib/prisma';
import { STSServiceException } from '@aws-sdk/client-sts';
import { getAccountIdFromAccessKey } from '@lib/account';
import { logActivity } from '@lib/activitylog';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
) {
  const account_id = req.query.account_id as string;
  const account = await prisma.account.findUnique({ where: { id: account_id } });
  if (account === null) {
    res.status(404).end();
    return;
  }

  switch (req.method) {
    case 'GET':
      res.status(200).json(account);
      return;
    case 'POST': {
      // TODO: validate / type check request parameters

      const data = req.body;
      console.log(typeof data);
      console.log(data);
      if (Object.keys(data).length === 0 && Object.getPrototypeOf(data) === Object.prototype) {
        res.status(200).json(account);
        return;
      }

      const account_name = data.name ? data.name as string : account.name;
      var access_key: string, secret_key: string;
      if (!data.access_key) {
        access_key = account.access_key;
        secret_key = (await prisma.credentials.findUnique({ where: { access_key: account.access_key } }) as Credentials).secret_key;
      } else {
        if (!data.secret_key) {
          res.status(400).end(`Property access_key must be accompanied by property secret_key`);
          return;
        }

        access_key = data.access_key as string;
        secret_key = data.secret_key as string;

        // look up account id from AWS via STS:GetCallerIdentity
        var new_account_id: string;
        try {
          new_account_id = await getAccountIdFromAccessKey(access_key, secret_key);
        } catch (e) {
          if (e instanceof STSServiceException && e.$metadata.httpStatusCode === 403) {
            res.status(403).end(`Invalid AWS credentials for access key ${access_key}`);
          } else {
            res.status(500).end(`Error retrieving account ID from AWS with access key ${access_key}`);
          }
          console.log(e);
          return;
        }

        // check whether credentials are for the current account
        if (account_id !== new_account_id) {
          res.status(409).end(`Access_key ${access_key} account ID ${new_account_id} does not match current account ID ${account_id}`);
          return;
        }
      }

      // update account in database
      try {
        const updatedAccountInput: Prisma.AccountUpdateInput = {
          name: account_name,
          access_key: access_key,
          credential: {
            create: {
              secret_key: secret_key,
            }
          }
        };

        const deleteCredential = prisma.credentials.delete({ where: { access_key: access_key } });
        const updateAccount = prisma.account.update({ where: { id: account_id }, data: updatedAccountInput });
        const [, updatedAccount] = await prisma.$transaction([deleteCredential, updateAccount]);

        res.status(200).json(updatedAccount);
        logActivity("TODO", "CREATE", `Updated account config for ${updatedAccount.id} (${updatedAccount.name})`);
        return;

      } catch (e) {
        console.log(e);
        res.status(500).end(`Error updating account ${account_id} (${account_name}) in database`);
        logActivity("TODO", "ERROR", `Error updating account ${account_id} (${account_name}) in database: ${e}`);
        return;
      }
    }
    case 'DELETE': {
      try {
        await prisma.account.delete({ where: { id: account_id } });
        res.status(204).end();
        logActivity("TODO", "DELETE", `Deleted account ${account_id} (${account.name})`);
        return;
      } catch (e) {
        console.log(e);
        res.status(500).end(`Failed to delete account ${account_id} (${account.name})`);
        logActivity("TODO", "ERROR", `Failed to delete account ${account_id} (${account.name})`);
        return;
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} not allowed`);
      return;
  }
}