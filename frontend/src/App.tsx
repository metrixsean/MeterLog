import { useState } from "react";

import { Dashboard } from "@/components/dashboard";
import { AuthForm } from "@/components/auth-form";
import { ModeToggle } from "@/components/mode-toggle";
import { getToken } from "@/lib/api";

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">meterlog</span>
        <ModeToggle />
      </div>
      {authed ? (
        <Dashboard onLogout={() => setAuthed(false)} />
      ) : (
        <AuthForm onDone={() => setAuthed(true)} />
      )}
    </main>
  );
}
