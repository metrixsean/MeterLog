import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordRequest,
  fetchHousehold,
  inviteRequest,
  removeMemberRequest,
  renameHouseholdRequest,
  type Household,
  type Member,
} from "@/lib/api";
import { navigate } from "@/lib/route";

const message = (err: unknown) => (err instanceof Error ? err.message : "Request failed");

export function HouseholdSettings() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setHousehold(await fetchHousehold());
    } catch (err) {
      setError(message(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    void run(async () => {
      const updated = await renameHouseholdRequest({ name });
      setHousehold((h) => h && { ...h, name: updated.name });
      setNotice("Household renamed.");
    });
  }

  function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      const added = await inviteRequest({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      form.reset();
      setNotice(`${added.email} can now log in with the password you set.`);
      await load();
    });
  }

  function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = String(data.get("new_password"));
    if (next !== String(data.get("confirm_password"))) {
      setNotice(null);
      setError("The new passwords do not match.");
      return;
    }
    void run(async () => {
      await changePasswordRequest({ current_password: String(data.get("current_password")), new_password: next });
      form.reset();
      setNotice("Password changed.");
    });
  }

  function remove(member: Member) {
    if (!window.confirm(`Remove ${member.email} from the household? They will no longer be able to log in.`)) return;
    void run(async () => {
      await removeMemberRequest(member.id);
      setHousehold((h) => h && { ...h, members: h.members.filter((m) => m.id !== member.id) });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate("/")} aria-label="Back to meters">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Household</h1>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {notice && <p className="text-muted-foreground text-sm">{notice}</p>}
      {household && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Name</CardTitle>
            </CardHeader>
            <CardContent>
              <form key={household.name} onSubmit={rename} className="flex gap-2">
                <Label htmlFor="household_name" className="sr-only">
                  Household name
                </Label>
                <Input id="household_name" name="name" defaultValue={household.name} required />
                <Button type="submit" variant="outline" disabled={busy}>
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Everyone here sees the same meters and can add readings.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-border divide-y">
                {household.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {m.email}
                        {m.id === household.me && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {m.id !== household.me && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => remove(m)}
                        aria-label={`Remove ${m.email}`}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invite a member</CardTitle>
              <CardDescription>Set a password for them and pass it on. They can change it here after logging in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={invite} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite_email">Email</Label>
                  <Input id="invite_email" name="email" type="email" autoComplete="off" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite_password">Password</Label>
                  <Input id="invite_password" name="password" type="password" autoComplete="new-password" required />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy}>
                    <UserPlus />
                    Invite
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" variant="outline" disabled={busy}>
                    <KeyRound />
                    Change password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
