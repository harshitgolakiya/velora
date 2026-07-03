import type { NextRequest } from "next/server";
import { handleLocaleRouting } from "@/lib/locale-routing";

export function proxy(request: NextRequest) {
  return handleLocaleRouting(request);
}

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
