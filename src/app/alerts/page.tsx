"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AlertsManagerView } from "@/components/alerts/AlertsManagerView";

export default function AlertsPage() {
  return (
    <AppLayout>
      <AlertsManagerView />
    </AppLayout>
  );
}
