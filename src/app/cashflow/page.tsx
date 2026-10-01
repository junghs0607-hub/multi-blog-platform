"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CashFlowView } from "@/components/cashflow/CashFlowView";

export default function CashflowPage() {
  return (
    <AppLayout>
      <CashFlowView />
    </AppLayout>
  );
}
