import { useEffect, useState } from "react";

import { Dashboard } from "@/components/dashboard";
import { AuthForm } from "@/components/auth-form";
import { MeterDetail } from "@/components/meter-detail";
import { ModeToggle } from "@/components/mode-toggle";
import { getToken, onSignedOut } from "@/lib/api";
import { useRoute } from "@/lib/route";

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const route = useRoute();

  useEffect(() => onSignedOut(() => setAuthed(false)), []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <a href="#/" className="text-lg font-semibold tracking-tight">
          meterlog
        </a>
        <ModeToggle />
      </div>
      {!authed ? (
        <AuthForm onDone={() => setAuthed(true)} />
      ) : route.page === "meter" ? (
        <MeterDetail key={route.id} id={route.id} />
      ) : (
        <Dashboard onLogout={() => setAuthed(false)} />
      )}
    </main>
  );
}
