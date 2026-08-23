"use client";

import { AccountDashboard, type AccountDashboardProps } from "./account-dashboard";

export function AccountWishlist(props: Omit<AccountDashboardProps, "section">) {
  return <AccountDashboard {...props} section="wishlist" />;
}
