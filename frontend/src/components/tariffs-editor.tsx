import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTariffRequest,
  deleteTariffRequest,
  fetchMeter,
  fetchTariffs,
  updateTariffRequest,
  type MeterRow,
  type Tariff,
  type UpdateTariffBody,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { navigate } from "@/lib/route";

const message = (err: unknown) => (err instanceof Error ? err.message : "Request failed");

function readForm(form: HTMLFormElement): UpdateTariffBody {
  const data = new FormData(form);
  const validTo = String(data.get("valid_to") ?? "");
  return {
    unit_price: Number(data.get("unit_price")),
    standing_charge_per_day: Number(data.get("standing_charge_per_day")),
    valid_from: String(data.get("valid_from")),
    valid_to: validTo || null,
  };
}

function TariffForm({
  unit,
  tariff,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  unit: string;
  tariff?: Tariff;
  submitLabel: string;
  onSubmit: (body: UpdateTariffBody, form: HTMLFormElement) => Promise<void>;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const prefix = tariff ? `t${tariff.id}-` : "new-";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      await onSubmit(readForm(form), form);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}unit_price`}>Unit price (per {unit})</Label>
        <Input
          id={`${prefix}unit_price`}
          name="unit_price"
          type="number"
          step="any"
          min={0}
          defaultValue={tariff?.unit_price}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}standing`}>Standing charge per day</Label>
        <Input
          id={`${prefix}standing`}
          name="standing_charge_per_day"
          type="number"
          step="any"
          min={0}
          defaultValue={tariff?.standing_charge_per_day}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}valid_from`}>Valid from</Label>
        <Input
          id={`${prefix}valid_from`}
          name="valid_from"
          type="date"
          defaultValue={tariff?.valid_from ?? undefined}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}valid_to`}>Valid to (optional)</Label>
        <Input id={`${prefix}valid_to`} name="valid_to" type="date" defaultValue={tariff?.valid_to ?? undefined} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function TariffsEditor({ meterId }: { meterId: number }) {
  const [meter, setMeter] = useState<MeterRow | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTariffs(await fetchTariffs(meterId));
    } catch (err) {
      setError(message(err));
    }
  }, [meterId]);

  useEffect(() => {
    let live = true;
    fetchMeter(meterId)
      .then((m) => live && setMeter(m))
      .catch((err) => live && setError(message(err)));
    void load();
    return () => {
      live = false;
    };
  }, [meterId, load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    }
  }

  async function remove(tariff: Tariff) {
    if (!window.confirm(`Delete the tariff from ${tariff.valid_from}?`)) return;
    await run(() => deleteTariffRequest(tariff.id));
  }

  const unit = meter?.unit ?? "unit";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/meters/${meterId}`)}
          aria-label="Back to meter"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tariffs{meter && <span className="text-muted-foreground capitalize"> / {meter.kind}</span>}
        </h1>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Add a tariff</CardTitle>
          <CardDescription>The rates printed on the bill. Leave the end date empty for the current tariff.</CardDescription>
        </CardHeader>
        <CardContent>
          <TariffForm
            unit={unit}
            submitLabel="Add tariff"
            onSubmit={async (body, form) => {
              if (await run(() => createTariffRequest({ meter_id: meterId, ...body }))) form.reset();
            }}
          />
        </CardContent>
      </Card>
      <div className="space-y-3">
        {tariffs.map((t) =>
          editing === t.id ? (
            <Card key={t.id}>
              <CardContent>
                <TariffForm
                  unit={unit}
                  tariff={t}
                  submitLabel="Save"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => {
                    if (await run(() => updateTariffRequest(t.id, body))) setEditing(null);
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t.valid_from} to {t.valid_to ?? "now"}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {t.unit_price} per {unit}, {formatMoney(t.standing_charge_per_day)} per day
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(t.id)} aria-label="Edit tariff">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t)} aria-label="Delete tariff">
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ),
        )}
        {tariffs.length === 0 && <p className="text-muted-foreground text-sm">No tariffs yet.</p>}
      </div>
    </div>
  );
}
