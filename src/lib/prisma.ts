// import { PrismaClient } from "@prisma/client";
// import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// import fs from "node:fs";
// import path from "node:path";

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// function resolveDatabaseUrl(rawUrl: string): string {
//   if (!rawUrl.startsWith("file:")) return rawUrl;

//   // Vercel serverless files are read-only except /tmp.
//   // For SQLite, copy bundled DB into /tmp and open from there.
//   if (process.env.VERCEL) {
//     const tmpDbPath = "/tmp/dev.db";
//     if (!fs.existsSync(tmpDbPath)) {
//       const candidatePaths = [
//         path.join(process.cwd(), "dev.db"),
//         path.join(process.cwd(), "prisma", "dev.db"),
//       ];
//       const source = candidatePaths.find((candidate) => fs.existsSync(candidate));
//       if (source) {
//         fs.copyFileSync(source, tmpDbPath);
//       }
//     }
//     return `file:${tmpDbPath}`;
//   }

//   return rawUrl;
// }

// const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL || "file:./dev.db");

// export const prisma =
//   global.prisma ||
//   new PrismaClient({
//     adapter: new PrismaBetterSqlite3({
//       url: databaseUrl,
//     }),
//     log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") {
//   global.prisma = prisma;
// }

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}