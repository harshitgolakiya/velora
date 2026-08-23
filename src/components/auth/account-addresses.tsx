"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountAddresses(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="addresses" />;
}
