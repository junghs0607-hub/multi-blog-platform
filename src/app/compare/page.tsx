"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssetCompareTool } from "@/components/compare/AssetCompareTool";

export default function ComparePage() {
  return (
    <AppLayout>
      <AssetCompareTool />
    </AppLayout>
  );
}
