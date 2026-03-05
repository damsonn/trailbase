import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

type AuthEnv = {
  Variables: {
    user: NonNullable<AuthSession>["user"];
    session: NonNullable<AuthSession>["session"];
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      401,
    );
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
