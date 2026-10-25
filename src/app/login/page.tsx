import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in · TraceFix" };

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{
        // Dark console backdrop: soft green glow over a faint grid.
        background:
          "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(31,122,77,0.28), transparent 70%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 32px 32px, linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 32px 32px, #0b110e",
      }}
    >
      <p className="text-3xl font-bold tracking-[0.18em] text-[#c9d4cf] sm:text-4xl">
        TRACE<span className="text-[#4cc285]">FIX</span>
      </p>
      <p className="mt-4 bg-black/40 px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-[#c9d4cf]">
        PERFORMANCE INCIDENT RESPONSE
      </p>

      <LoginForm />

      <div className="mt-10 rounded border border-white/10 bg-black/40 px-4 py-2.5 font-mono text-[11px] leading-5 text-[#8fa39a]">
        <p>
          ENV: <span className="text-[#c9d4cf]">LOCAL_PROTOTYPE</span>
        </p>
        <p>
          AUTH: <span className="text-[#c9d4cf]">NOT_ENFORCED</span>
        </p>
      </div>
    </div>
  );
}
