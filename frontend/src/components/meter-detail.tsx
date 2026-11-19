import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, Pencil, Receipt, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeterReadings } from "@/components/meter-readings";
import { UsageChart } from "@/components/usage-chart";
import {
  deleteMeterRequest,
  fetchMeter,
  fetchUsage,
  updateMeterRequest,
  type MeterRow,
  type Usage,
} from "@/lib/api";
import { daysAgo, formatAmount, formatMoney } from "@/lib/format";
import { navigate } from "@/lib/route";

const RANGES = [30, 90] as const;

export function MeterDetail({ id }: { id: number }) {
  const [meter, setMeter] = useState<MeterRow | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchMeter(id)
      .then((m) => live && setMeter(m))
      .catch((err) => live && setError(err instanceof Error ? err.message : "Request failed"));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    let live = true;
    fetchUsage(id, { from: daysAgo(range - 1), to: daysAgo(0) })
      .then((u) => live && setUsage(u))
      .catch((err) => live && setError(err instanceof Error ? err.message : "Request failed"));
    return () => {
      live = false;
    };
  }, [id, range, version]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const serial = String(data.get("serial"));
    setError(null);
    try {
      const updated = await updateMeterRequest(id, {
        unit: String(data.get("unit")),
        rollover_digits: Number(data.get("rollover_digits")),
        ...(serial && { serial }),
      });
      setMeter(updated);
      setEditing(false);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function remove() {
    if (!meter) return;
    if (!window.confirm(`Delete this ${meter.kind} meter with all its readings, tariffs and bills?`)) return;
    setError(null);
    try {
      await deleteMeterRequest(id);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  const back = (
    <Button variant="outline" size="icon" onClick={() => navigate("/")} aria-label="Back to meters">
      <ArrowLeft />
    </Button>
  );

  if (!meter) {
    return (
      <div className="flex items-center gap-3">
        {back}
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <p className="text-muted-foreground text-sm">Loading...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight capitalize">{meter.kind}</h1>
        <span className="text-muted-foreground text-sm">
          {meter.unit}
          {meter.serial && ` / ${meter.serial}`}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/meters/${id}/tariffs`)}>
            <Receipt />
            Tariffs
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/meters/${id}/billing`)}>
            <FileText />
            Bills
          </Button>
          <Button variant="outline" size="icon" onClick={() => setEditing((v) => !v)} aria-label="Edit meter">
            <Pencil />
          </Button>
          <Button variant="outline" size="icon" onClick={remove} aria-label="Delete meter">
            <Trash2 />
          </Button>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit meter</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue={meter.unit} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial">Serial</Label>
                <Input id="serial" name="serial" defaultValue={meter.serial ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollover_digits">Dial digits</Label>
                <Input
                  id="rollover_digits"
                  name="rollover_digits"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={meter.rollover_digits}
                  required
                />
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Daily usage</CardTitle>
            <CardDescription>
              {usage
                ? `${formatAmount(usage.total_usage)} ${meter.unit}` +
                  (usage.total_cost === null ? ", no tariff" : `, est. ${formatMoney(usage.total_cost)}`)
                : "..."}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={r === range ? "default" : "outline"}
                onClick={() => setRange(r)}
              >
                {r} days
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>{usage && <UsageChart days={usage.days} unit={meter.unit} />}</CardContent>
      </Card>
      <MeterReadings meter={meter} onSaved={() => setVersion((v) => v + 1)} />
    </div>
  );
}
