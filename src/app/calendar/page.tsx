"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { InvestmentCalendarView } from "@/components/calendar/InvestmentCalendarView";

export default function CalendarPage() {
  return (
    <AppLayout>
      <InvestmentCalendarView />
    </AppLayout>
  );
}
