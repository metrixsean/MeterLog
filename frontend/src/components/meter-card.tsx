import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUsage, type Meter, type Usage } from "@/lib/api";
import { daysAgo, formatAmount, formatMoney, monthStart } from "@/lib/format";

export function MeterCard({ meter }: { meter: Meter }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchUsage(meter.id, { from: monthStart(), to: daysAgo(0) })
      .then((u) => live && setUsage(u))
      .catch((err) => live && setError(err instanceof Error ? err.message : "Request failed"));
    return () => {
      live = false;
    };
  }, [meter.id]);

  const last = usage?.last_reading;

  return (
    <a href={`#/meters/${meter.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Card className="hover:bg-accent h-full">
        <CardHeader>
          <CardTitle className="capitalize">{meter.kind}</CardTitle>
          <CardDescription>
            {meter.unit}
            {meter.serial && ` / ${meter.serial}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {error ? (
            <p className="text-destructive col-span-2">{error}</p>
          ) : (
            <>
              <div>
                <p className="text-muted-foreground">Last reading</p>
                {last ? (
                  <>
                    <p className="flex items-center gap-1 font-medium tabular-nums">
                      {formatAmount(last.value)}
                      {last.flagged && <TriangleAlert className="text-destructive size-4" aria-label="Flagged" />}
                    </p>
                    <p className="text-muted-foreground text-xs">{new Date(last.read_at).toLocaleDateString()}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{usage ? "None yet" : "..."}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">This month</p>
                {usage ? (
                  <>
                    <p className="font-medium tabular-nums">
                      {formatAmount(usage.total_usage)} {meter.unit}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {usage.total_cost === null ? "No tariff" : `est. ${formatMoney(usage.total_cost)}`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">...</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
