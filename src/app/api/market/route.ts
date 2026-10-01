import { NextResponse } from "next/server";
import { INITIAL_MARKET_INDICES, INITIAL_ECONOMIC_EVENTS } from "@/lib/mockData";
import { FX_RATES } from "@/lib/utils";

export async function GET() {
  return NextResponse.json({
    indices: INITIAL_MARKET_INDICES,
    events: INITIAL_ECONOMIC_EVENTS,
    fxRates: FX_RATES,
    kimchiPremium: {
      btc: 1.42,
      eth: 1.25,
      sol: 2.36,
      xrp: 1.62,
    },
  });
}
