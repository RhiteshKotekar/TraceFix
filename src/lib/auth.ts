// shortcut: login is not enforced for the prototype (any visitor is treated as the dashboard user).
// guard() keeps one place to add real session checks later.

export type User = { email: string; name: string };
const DASHBOARD_USER: User = { email: "dashboard", name: "Dashboard user" };

export async function requirePageUser(): Promise<User> {
  return DASHBOARD_USER;
}

const json = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

// Blocks cross-site writes (a page on another origin POSTing to TraceFix); otherwise allows the request.
export async function guard(req: Request): Promise<{ user: User; error?: undefined } | { user?: undefined; error: Response }> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (req.method !== "GET" && origin && host) {
    try {
      if (new URL(origin).host !== host) return { error: json(403, "FORBIDDEN", "Cross-origin request refused.") };
    } catch {
      return { error: json(403, "FORBIDDEN", "Cross-origin request refused.") };
    }
  }
  return { user: DASHBOARD_USER };
}
