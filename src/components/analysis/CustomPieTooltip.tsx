import React from "react";
import { useCurrency } from "@/contexts/CurrencyContext";

type PiePayload = {
  name: string;
  value: number;
  payload: { total: number; color: string } & Record<string, unknown>;
};

type Props = {
  active?: boolean;
  payload?: PiePayload[];
};

export default function CustomPieTooltip({ active, payload }: Props) {
  const { currency } = useCurrency();

  if (!active || !payload || !payload?.length) return null;

  const data = payload[0];
  const percentage = ((data.value / data.payload.total) * 100).toFixed(1);
  return (
    <div
      className="px-3 py-2 rounded-lg shadow-lg border border-white"
      style={{
        backgroundColor: data.payload.color,
      }}
    >
      <p className="font-medium text-white">{data.name}</p>
      <p className="text-white/90">
        {currency.symbol}
        {data.value.toLocaleString(currency.locale)}
      </p>
      <p className="text-white/80 text-sm">{percentage}%</p>
    </div>
  );
}
