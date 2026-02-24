import { query } from "./_generated/server";
import { isAdmin as checkAdmin } from "./lib/auth";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await checkAdmin(ctx);
  },
});
