import { useCallback, useEffect, useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeterCard } from "@/components/meter-card";
import { createMeter, fetchMeters, setToken, type Meter } from "@/lib/api";

const KINDS = ["electric", "gas", "water"] as const;

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMeters(await fetchMeters());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const serial = String(data.get("serial"));
    setError(null);
    try {
      await createMeter({
        kind: String(data.get("kind")) as (typeof KINDS)[number],
        unit: String(data.get("unit")),
        rollover_digits: Number(data.get("rollover_digits")),
        ...(serial && { serial }),
      });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  function logout() {
    setToken(null);
    onLogout();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Meters</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="#/flagged">
              <TriangleAlert />
              Flagged
            </a>
          </Button>
          <Button variant="outline" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {meters.map((m) => (
          <MeterCard key={m.id} meter={m} />
        ))}
        {meters.length === 0 && <p className="text-muted-foreground text-sm">No meters yet.</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add a meter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="kWh" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial</Label>
              <Input id="serial" name="serial" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollover_digits">Dial digits</Label>
              <Input id="rollover_digits" name="rollover_digits" type="number" min={1} max={12} defaultValue={5} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add meter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
