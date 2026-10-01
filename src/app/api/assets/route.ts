import { NextResponse } from "next/server";
import { INITIAL_ASSETS, INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from "@/lib/mockData";

export async function GET() {
  return NextResponse.json({
    assets: INITIAL_ASSETS,
    accounts: INITIAL_ACCOUNTS,
    transactions: INITIAL_TRANSACTIONS,
  });
}
