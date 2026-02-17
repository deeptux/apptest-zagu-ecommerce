"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createUserSession } from "@/lib/auth";

export type LoginState = {
  error: string | null;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.password !== password) {
    return { error: "Invalid credentials." };
  }

  await createUserSession(user.id, user.role);

  if (user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/dealer/dashboard");
}
