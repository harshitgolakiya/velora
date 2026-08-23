"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountReturns(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="returns" />;
}
