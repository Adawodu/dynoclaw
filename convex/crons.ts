import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "fetch cost data",
  { hours: 6 },
  api.costActions.fetchAndStoreCosts
);

export default crons;
