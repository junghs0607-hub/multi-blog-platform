"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaxSimulatorView } from "@/components/taxes/TaxSimulatorView";

export default function TaxesPage() {
  return (
    <AppLayout>
      <TaxSimulatorView />
    </AppLayout>
  );
}
