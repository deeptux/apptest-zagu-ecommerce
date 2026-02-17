import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encodeSession, getSession } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    if (user.role === Role.ADMIN) {
      redirect("/admin/dashboard");
    }
    redirect("/dealer/dashboard");
  }
  return user;
}

export async function createUserSession(userId: number, role: Role) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession({ userId, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}
