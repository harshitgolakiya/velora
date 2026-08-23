"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountSettings(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="settings" />;
}
