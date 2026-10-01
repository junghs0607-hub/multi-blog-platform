"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataImportExportView } from "@/components/data/DataImportExportView";

export default function DataIOPage() {
  return (
    <AppLayout>
      <DataImportExportView />
    </AppLayout>
  );
}
