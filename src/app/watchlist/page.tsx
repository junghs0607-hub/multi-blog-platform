"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WatchlistView } from "@/components/watchlist/WatchlistView";
import { AddAssetModal } from "@/components/modals/AddAssetModal";

export default function WatchlistPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <AppLayout>
      <WatchlistView onOpenAddAsset={() => setIsAddOpen(true)} />
      <AddAssetModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </AppLayout>
  );
}
