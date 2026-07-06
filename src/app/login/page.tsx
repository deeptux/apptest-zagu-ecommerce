"use client";

import Image from "next/image";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { assetPath } from "@/lib/base-path";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-6 md:p-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl overflow-hidden rounded-[34px] border border-[#ebedf2] bg-white shadow-[0_22px_55px_rgba(23,31,56,0.08)]">
        <section className="hidden w-[40%] shrink-0 bg-gradient-to-b from-[#f1b53b] to-[#f3bc4f] min-[800px]:flex min-[800px]:flex-col">
          <div className="relative h-[150px] w-full">
            <Image
              src={assetPath("/images/company-logo-sm.png")}
              alt="Zagu company logo small"
              fill
              className="object-cover object-left min-[1070px]:hidden"
              priority
              unoptimized
            />
            <Image
              src={assetPath("/images/company-logo.png")}
              alt="Zagu company logo"
              fill
              className="hidden object-cover object-left min-[1070px]:block"
              priority
              unoptimized
            />
          </div>
          <div className="relative min-h-0 flex-1 w-full">
            <Image
              src={assetPath("/images/bg-login.png")}
              alt="Zagu drink background"
              fill
              className="object-cover object-center"
              unoptimized
            />
          </div>
        </section>

        <section className="flex w-full flex-col justify-center p-8 md:w-[60%] md:px-12 md:py-14">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Demo credentials are pre-seeded for Admin and Dealer.
          </p>

          <form action={formAction} className="mt-9 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                placeholder="admin@zagu.local"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none ring-[#f4b133] focus:ring-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none ring-[#f4b133] focus:ring-2"
                required
              />
            </div>
            {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#f1b53b] py-3.5 text-lg font-semibold text-white transition hover:bg-[#e7a221] disabled:opacity-70"
              disabled={isPending}
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-slate-100 p-4 text-xs leading-6 text-slate-600">
            <div>
              <strong>Admin:</strong> admin@zagu.local / admin123
            </div>
            <div>
              <strong>Dealer:</strong> dealer@zagu.local / dealer123
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
