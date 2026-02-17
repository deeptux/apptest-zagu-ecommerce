import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";

export type SessionPayload = {
  userId: number;
  role: Role;
};

export function encodeSession(payload: SessionPayload): string {
  return `${payload.userId}:${payload.role}`;
}

export function decodeSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  const [idPart, rolePart] = raw.split(":");
  const userId = Number(idPart);

  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!rolePart || !Object.values(Role).includes(rolePart as Role)) return null;

  return { userId, role: rolePart as Role };
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return decodeSession(raw);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
