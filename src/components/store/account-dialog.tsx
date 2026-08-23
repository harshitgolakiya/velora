"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { AccountAccess } from "@/components/auth/account-access";

export function AccountDialog({
  open,
  onOpenChange,
  accountHref = "/account",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountHref?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="storefront-modal storefront-panel fixed left-1/2 top-1/2 z-[120] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto bg-[var(--surface)] p-0 text-[var(--foreground)] outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 font-serif text-2xl font-medium">
                <UserRound className="size-5 text-[var(--accent)]" />
                Account access
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Sign in or create an account without leaving your current page.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close account login"
                className="storefront-action storefront-icon-button grid size-10 shrink-0 place-items-center border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground)]"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="p-5 sm:p-6">
            <AccountAccess compact />
            <Dialog.Close asChild>
              <Link
                href={accountHref}
                className="storefront-action mt-4 inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4 hover:text-[var(--accent)]"
              >
                Open full account page
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
