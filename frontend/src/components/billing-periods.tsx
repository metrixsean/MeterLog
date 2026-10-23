import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBillingPeriodRequest,
  deleteBillingPeriodRequest,
  fetchBillingPeriods,
  fetchMeter,
  fetchPeriodSummary,
  updateBillingPeriodRequest,
  type BillingPeriod,
  type MeterRow,
  type PeriodSummary,
  type UpdateBillingPeriodBody,
} from "@/lib/api";
import { formatAmount, formatMoney } from "@/lib/format";
import { navigate } from "@/lib/route";

const message = (err: unknown) => (err instanceof Error ? err.message : "Request failed");

function readForm(form: HTMLFormElement): UpdateBillingPeriodBody {
  const data = new FormData(form);
  return {
    start_date: String(data.get("start_date")),
    end_date: String(data.get("end_date")),
    billed_amount: Number(data.get("billed_amount")),
  };
}

function PeriodForm({
  period,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  period?: BillingPeriod;
  submitLabel: string;
  onSubmit: (body: UpdateBillingPeriodBody, form: HTMLFormElement) => Promise<void>;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const prefix = period ? `p${period.id}-` : "new-";

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
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}start_date`}>From</Label>
        <Input
          id={`${prefix}start_date`}
          name="start_date"
          type="date"
          defaultValue={period?.start_date ?? undefined}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}end_date`}>To</Label>
        <Input
          id={`${prefix}end_date`}
          name="end_date"
          type="date"
          defaultValue={period?.end_date ?? undefined}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}billed_amount`}>Billed amount</Label>
        <Input
          id={`${prefix}billed_amount`}
          name="billed_amount"
          type="number"
          step="any"
          min={0}
          defaultValue={period?.billed_amount}
          required
        />
      </div>
      <div className="flex gap-2 sm:col-span-3">
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

function comparison(summary: PeriodSummary) {
  if (summary.difference === null) return "No tariff covers this period, so there is no estimate.";
  const gap = Math.abs(summary.difference);
  if (gap < 0.005) return "The bill matches the estimate.";
  return `The bill is ${formatMoney(gap)} ${summary.difference > 0 ? "more" : "less"} than the estimate.`;
}

function coverage(summary: PeriodSummary) {
  const notes = [];
  if (summary.covered_days < summary.days) {
    notes.push(`Readings cover ${summary.covered_days} of ${summary.days} days.`);
  }
  if (summary.priced_days < summary.covered_days) {
    notes.push(`${summary.covered_days - summary.priced_days} days have no tariff.`);
  }
  return notes.join(" ");
}

function PeriodSummaryLine({ period, unit }: { period: BillingPeriod; unit: string }) {
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id, start_date, end_date, billed_amount } = period;

  useEffect(() => {
    let live = true;
    setSummary(null);
    setError(null);
    fetchPeriodSummary(id)
      .then((s) => live && setSummary(s))
      .catch((err) => live && setError(message(err)));
    return () => {
      live = false;
    };
  }, [id, start_date, end_date, billed_amount]);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!summary) return <p className="text-muted-foreground text-sm">Estimating...</p>;

  const note = coverage(summary);
  return (
    <div className="space-y-1">
      <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt className="text-muted-foreground">Billed</dt>
          <dd className="font-medium">{formatMoney(summary.billed_amount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estimated</dt>
          <dd className="font-medium">
            {summary.estimated_cost === null ? "-" : formatMoney(summary.estimated_cost)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Used</dt>
          <dd className="font-medium">
            {formatAmount(summary.total_usage)} {unit}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-sm">{comparison(summary)}</p>
      {note && <p className="text-muted-foreground text-sm">{note}</p>}
    </div>
  );
}

export function BillingPeriods({ meterId }: { meterId: number }) {
  const [meter, setMeter] = useState<MeterRow | null>(null);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPeriods(await fetchBillingPeriods(meterId));
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

  async function remove(period: BillingPeriod) {
    if (!window.confirm(`Delete the bill for ${period.start_date} to ${period.end_date}?`)) return;
    await run(() => deleteBillingPeriodRequest(period.id));
  }

  const unit = meter?.unit ?? "units";

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
          Bills{meter && <span className="text-muted-foreground capitalize"> / {meter.kind}</span>}
        </h1>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Add a bill</CardTitle>
          <CardDescription>The dates and total from the bill. It is compared with the cost estimated from your readings.</CardDescription>
        </CardHeader>
        <CardContent>
          <PeriodForm
            submitLabel="Add bill"
            onSubmit={async (body, form) => {
              if (await run(() => createBillingPeriodRequest({ meter_id: meterId, ...body }))) form.reset();
            }}
          />
        </CardContent>
      </Card>
      <div className="space-y-3">
        {periods.map((p) =>
          editing === p.id ? (
            <Card key={p.id}>
              <CardContent>
                <PeriodForm
                  period={p}
                  submitLabel="Save"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => {
                    if (await run(() => updateBillingPeriodRequest(p.id, body))) setEditing(null);
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card key={p.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">
                    {p.start_date} to {p.end_date}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(p.id)} aria-label="Edit bill">
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Delete bill">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <PeriodSummaryLine period={p} unit={unit} />
              </CardContent>
            </Card>
          ),
        )}
        {periods.length === 0 && <p className="text-muted-foreground text-sm">No bills yet.</p>}
      </div>
    </div>
  );
}
