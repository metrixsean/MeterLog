import { useEffect, useState } from "react";

import { Dashboard } from "@/components/dashboard";
import { AuthForm } from "@/components/auth-form";
import { MeterDetail } from "@/components/meter-detail";
import { ModeToggle } from "@/components/mode-toggle";
import { TariffsEditor } from "@/components/tariffs-editor";
import { getToken, onSignedOut } from "@/lib/api";
import { useRoute } from "@/lib/route";

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [expired, setExpired] = useState(false);
  const route = useRoute();

  useEffect(
    () =>
      onSignedOut(() => {
        setAuthed(false);
        setExpired(true);
      }),
    [],
  );

  useEffect(() => {
    const sync = () => setAuthed(getToken() !== null);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <a href="#/" className="text-lg font-semibold tracking-tight">
          meterlog
        </a>
        <ModeToggle />
      </div>
      {!authed ? (
        <AuthForm
          expired={expired}
          onDone={() => {
            setAuthed(true);
            setExpired(false);
          }}
        />
      ) : route.page === "meter" ? (
        <MeterDetail key={route.id} id={route.id} />
      ) : route.page === "tariffs" ? (
        <TariffsEditor key={route.id} meterId={route.id} />
      ) : (
        <Dashboard onLogout={() => setAuthed(false)} />
      )}
    </main>
  );
}
