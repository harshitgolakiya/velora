import { AccountWishlist } from "@/components/auth/account-wishlist";
import { AccountSectionShell } from "@/components/auth/account-section-shell";

export default function AccountWishlistPage() {
  return <AccountSectionShell component={AccountWishlist} needsCatalog />;
}
