"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className="quiet-button" type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }}>{busy ? "Keluar…" : "Keluar"}</button>;
}
