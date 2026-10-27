import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteReadingRequest,
  dismissReadingRequest,
  fetchFlaggedReadings,
  type FlaggedReading,
} from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { navigate } from "@/lib/route";

const message = (err: unknown) => (err instanceof Error ? err.message : "Request failed");

export function FlaggedReadings() {
  const [readings, setReadings] = useState<FlaggedReading[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setReadings(await fetchFlaggedReadings());
    } catch (err) {
      setError(message(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(reading: FlaggedReading, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(reading.id);
    try {
      await fn();
      setReadings((rows) => rows?.filter((r) => r.id !== reading.id) ?? null);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(null);
    }
  }

  function remove(reading: FlaggedReading) {
    if (!window.confirm(`Delete the reading of ${formatAmount(reading.value)}?`)) return;
    void run(reading, () => deleteReadingRequest(reading.meter_id, reading.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate("/")} aria-label="Back to meters">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Flagged readings</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Keep a reading that is correct, or delete one that was entered wrong. Kept readings are not flagged again.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {readings?.length === 0 && <p className="text-muted-foreground text-sm">Nothing flagged.</p>}
      {readings?.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between gap-4">
              <a href={`#/meters/${r.meter_id}`} className="capitalize hover:underline">
                {String(r.meter_kind)}
              </a>
              <span className="tabular-nums">
                {formatAmount(r.value)} {String(r.meter_unit)}
              </span>
            </CardTitle>
            <CardDescription>{new Date(r.read_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-destructive text-sm">{r.flag_reason}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy === r.id}
                onClick={() => void run(r, () => dismissReadingRequest(r.meter_id, r.id))}
              >
                <Check />
                Keep
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy === r.id}
                onClick={() => remove(r)}
                aria-label="Delete reading"
              >
                <Trash2 />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
