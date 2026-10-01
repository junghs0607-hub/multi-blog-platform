"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIAdvisorView } from "@/components/ai/AIAdvisorView";

export default function AIAdvisorPage() {
  return (
    <AppLayout>
      <AIAdvisorView />
    </AppLayout>
  );
}
