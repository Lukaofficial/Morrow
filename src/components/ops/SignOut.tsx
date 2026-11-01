"use client";

import { useRouter } from "next/navigation";

export function SignOut({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/ops/session", { method: "DELETE" });
        router.replace("/ops/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
