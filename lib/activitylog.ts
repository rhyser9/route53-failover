
import prisma from "./prisma";
import { Prisma } from "@prisma/client";

export async function logActivity(user: string, action: string, log: string) {
  const logInput: Prisma.LogCreateInput = {
    user: user,
    action: action,
    log: log
  };

  return prisma.log.create({ data: logInput });
}

export async function logSiteActivity(site_id: number, user: string, action: string, log: string) {
  const logInput: Prisma.LogCreateInput = {
    site: { connect: { id: site_id } },
    user: user,
    action: action,
    log: log
  };

  return prisma.log.create({ data: logInput });
}