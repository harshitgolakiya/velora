"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountOverview(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="overview" />;
}
