import { useEffect, useState } from "react";
import { ArrowLeft, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MeterReadings } from "@/components/meter-readings";
import { UsageChart } from "@/components/usage-chart";
import { fetchMeter, fetchUsage, type MeterRow, type Usage } from "@/lib/api";
import { daysAgo, formatAmount, formatMoney } from "@/lib/format";
import { navigate } from "@/lib/route";

const RANGES = [30, 90] as const;

export function MeterDetail({ id }: { id: number }) {
  const [meter, setMeter] = useState<MeterRow | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [version, setVersion] = useState(0);
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
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate(`/meters/${id}/tariffs`)}>
          <Receipt />
          Tariffs
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
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
