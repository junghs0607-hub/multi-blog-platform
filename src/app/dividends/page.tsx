"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DividendCalendarView } from "@/components/dividends/DividendCalendarView";

export default function DividendsPage() {
  return (
    <AppLayout>
      <DividendCalendarView />
    </AppLayout>
  );
}
