import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <nav className="h-14 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Landed" className="h-7 w-auto" />
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center p-6">
        <SignIn />
      </div>
    </div>
  );
}
