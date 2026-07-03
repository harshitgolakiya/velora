import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Profile, User } from "next-auth";

const mocks = vi.hoisted(() => ({
  accountSessionCreate: vi.fn(),
  accountSessionFindUnique: vi.fn(),
  socialUpsert: vi.fn(),
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountSession: {
      create: mocks.accountSessionCreate,
      findUnique: mocks.accountSessionFindUnique,
    },
    socialProviderAccount: {
      upsert: mocks.socialUpsert,
    },
    user: {
      create: mocks.userCreate,
      findUnique: mocks.userFindUnique,
    },
  },
}));

function socialSignInArgs({
  email = "Customer@Example.com",
  verified = true,
}: {
  email?: string;
  verified?: boolean;
}) {
  return {
    user: { id: "provider_user_1", email, name: "Social Customer" } as User,
    account: { provider: "google", providerAccountId: "google_1", type: "oauth" } as Account,
    profile: { email_verified: verified } as Profile,
  };
}

describe("social provider authentication rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links a verified provider account to an existing active customer by email", async () => {
    const { authOptions } = await import("@/lib/auth");
    const signIn = authOptions.callbacks?.signIn;
    expect(signIn).toBeTypeOf("function");
    mocks.userFindUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@example.com",
      name: "Existing Customer",
      role: "CUSTOMER",
      deletedAt: null,
    });
    mocks.socialUpsert.mockResolvedValue({ id: "link_1" });

    const args = socialSignInArgs({});
    await expect(signIn?.(args)).resolves.toBe(true);

    expect(mocks.socialUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: "google_1" } },
      create: expect.objectContaining({
        userId: "user_1",
        email: "customer@example.com",
      }),
    }));
    expect(args.user.id).toBe("user_1");
    expect(args.user.email).toBe("customer@example.com");
  });

  it("creates a customer account for a verified new provider email", async () => {
    const { authOptions } = await import("@/lib/auth");
    const signIn = authOptions.callbacks?.signIn;
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      id: "user_2",
      email: "new@example.com",
      name: "New Customer",
      role: "CUSTOMER",
      deletedAt: null,
    });
    mocks.socialUpsert.mockResolvedValue({ id: "link_2" });

    await expect(signIn?.(socialSignInArgs({ email: "New@Example.com" }))).resolves.toBe(true);

    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: "new@example.com",
        emailVerifiedAt: expect.any(Date),
      }),
    }));
  });

  it("rejects a provider profile with an explicitly unverified email", async () => {
    const { authOptions } = await import("@/lib/auth");
    const signIn = authOptions.callbacks?.signIn;

    await expect(signIn?.(socialSignInArgs({ verified: false }))).resolves.toBe(false);

    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.socialUpsert).not.toHaveBeenCalled();
  });

  it("uses an eight-hour session window and hides revoked session tokens", async () => {
    const { authOptions } = await import("@/lib/auth");
    const jwt = authOptions.callbacks?.jwt;
    const sessionCallback = authOptions.callbacks?.session;
    expect(authOptions.session?.maxAge).toBe(8 * 60 * 60);
    mocks.accountSessionFindUnique.mockResolvedValue({ revokedAt: new Date("2026-07-03T08:00:00.000Z") });

    const token = await jwt?.({
      token: { sub: "user_1", sessionId: "session_revoked_1234567890" },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: "update",
      session: null,
    } as unknown as Parameters<NonNullable<typeof jwt>>[0]);
    const session = await sessionCallback?.({
      session: {
        user: {
          id: "user_1",
          role: "CUSTOMER",
          email: "customer@example.com",
          name: "Customer",
        },
        expires: "2026-07-03T16:00:00.000Z",
      },
      token: token!,
      user: undefined,
    } as unknown as Parameters<NonNullable<typeof sessionCallback>>[0]);
    const sessionUser = session?.user as { id?: string; email?: string | null; sessionId?: string } | undefined;

    expect(token?.sessionRevoked).toBe(true);
    expect(sessionUser?.id).toBe("");
    expect(sessionUser?.email).toBeNull();
    expect(sessionUser?.sessionId).toBeUndefined();
  });
});
