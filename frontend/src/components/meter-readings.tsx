import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReadingRequest, fetchReadings, type Meter, type Reading } from "@/lib/api";

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function MeterReadings({ meter, onBack }: { meter: Meter; onBack: () => void }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReadings(await fetchReadings(meter.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }, [meter.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    setNotice(null);
    try {
      const reading = await createReadingRequest({
        meter_id: meter.id,
        value: Number(data.get("value")),
        read_at: new Date(String(data.get("read_at"))).getTime(),
      });
      if (reading.flagged) setNotice(`Saved, but flagged: ${reading.flag_reason}`);
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Back to meters">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight capitalize">{meter.kind}</h1>
        <span className="text-muted-foreground text-sm">
          {meter.unit}
          {meter.serial && ` / ${meter.serial}`}
        </span>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {notice && <p className="text-muted-foreground text-sm">{notice}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Add a reading</CardTitle>
          <CardDescription>The value shown on the dial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="value">Value ({meter.unit})</Label>
              <Input id="value" name="value" type="number" step="any" min={0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="read_at">Read at</Label>
              <Input id="read_at" name="read_at" type="datetime-local" defaultValue={localNow()} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save reading</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-left">
          <tr>
            <th className="py-2 font-medium">Read at</th>
            <th className="py-2 text-right font-medium">Value</th>
            <th className="py-2 pl-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">{r.read_at ? new Date(r.read_at).toLocaleString() : ""}</td>
              <td className="py-2 text-right tabular-nums">{r.value}</td>
              <td className="py-2 pl-4">
                {r.flagged && (
                  <span className="text-destructive inline-flex items-center gap-1">
                    <TriangleAlert className="size-4" />
                    {r.flag_reason}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {readings.length === 0 && <p className="text-muted-foreground text-sm">No readings yet.</p>}
    </div>
  );
}
