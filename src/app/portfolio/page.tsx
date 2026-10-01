"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PortfolioAnalysisView } from "@/components/portfolio/PortfolioAnalysisView";

export default function PortfolioPage() {
  return (
    <AppLayout>
      <PortfolioAnalysisView />
    </AppLayout>
  );
}
