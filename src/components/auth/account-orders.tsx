"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountOrders(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="orders" />;
}
