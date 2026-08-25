import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Central pricing data source. Exchange rates / currencies / payment methods live
 * in the database; any admin edit is pushed here over realtime and every price
 * query in the app is refetched immediately.
 */
export function PricingSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      for (const key of [
        ["catalog"],
        ["offer"],
        ["currencies"],
        ["payment-methods"],
        ["admin-finance"],
        ["admin-rates"],
        ["admin-methods"],
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const channel = supabase
      .channel("pricing-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "currencies" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_method_configs" },
        invalidate,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
