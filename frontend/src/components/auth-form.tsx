import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginRequest, setToken, signupRequest } from "@/lib/api";

export function AuthForm({ onDone }: { onDone: () => void }) {
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    setBusy(true);
    setError(null);
    try {
      const session = signingUp
        ? await signupRequest({ email, password, household_name: String(data.get("household_name")) })
        : await loginRequest({ email, password });
      setToken(session.token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{signingUp ? "Create a household" : "Log in"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {signingUp && (
            <div className="space-y-2">
              <Label htmlFor="household_name">Household name</Label>
              <Input id="household_name" name="household_name" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy}>
              {signingUp ? "Sign up" : "Log in"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSigningUp(!signingUp)}>
              {signingUp ? "Have an account?" : "New household"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
