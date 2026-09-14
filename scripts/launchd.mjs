#!/usr/bin/env node
// Compatibility entry; new installs should use dot-ai-quota setup.
import { loadConfig } from "../src/config.mjs";
import { manageSchedule } from "../src/scheduler.mjs";
try {
  console.log(manageSchedule(process.argv[2] || "status", loadConfig()));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
