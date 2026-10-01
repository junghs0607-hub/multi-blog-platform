"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsManagerView } from "@/components/accounts/AccountsManagerView";

export default function AccountsPage() {
  return (
    <AppLayout>
      <AccountsManagerView />
    </AppLayout>
  );
}
