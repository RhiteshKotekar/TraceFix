"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/session";
import { Icon } from "@/components/Icon";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="mt-8 w-full max-w-md overflow-hidden rounded-lg bg-white text-[#16211c] shadow-2xl">
      <form
        className="px-8 pb-8 pt-9 sm:px-10"
        onSubmit={(e) => {
          e.preventDefault();
          // Not enforced: any credentials sign in.
          signIn(email);
          router.push("/");
        }}
      >
        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e2f4ea] text-[#1f7a4d]">
            <Icon name="pin" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-sm font-semibold tracking-[0.2em]">TRACEFIX CONSOLE</h1>
          <p className="mt-1 text-sm text-[#5a6a62]">Alerts in, verified fixes out</p>
        </div>

        <label htmlFor="email" className="mt-8 block text-sm font-semibold">
          Email address
        </label>
        <div className="relative mt-1.5">
          <Icon name="mail" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6a62]" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[#e2e6ea] py-3 pl-10 pr-3 text-sm placeholder:text-[#8a978f]"
          />
        </div>

        <label htmlFor="password" className="mt-5 block text-sm font-semibold">
          Password
        </label>
        <div className="relative mt-1.5">
          <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6a62]" />
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[#e2e6ea] py-3 pl-10 pr-11 text-sm placeholder:text-[#8a978f]"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#5a6a62] hover:text-[#16211c]"
          >
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        </div>

        <button
          type="submit"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-md bg-[#1f7a4d] py-3 text-sm font-semibold text-white hover:bg-[#1a6a42]"
        >
          Sign in
          <Icon name="arrowRight" />
        </button>
      </form>
      <p className="flex items-center justify-center gap-2 border-t border-[#e2e6ea] bg-[#f7f9fa] py-3.5 text-sm text-[#5a6a62]">
        <Icon name="shield" />
        Local prototype · any credentials work
      </p>
    </div>
  );
}
