#!/usr/bin/env node
// Cursor stop hook: a docs nudge returned as {followup_message} (bounded by loop_limit in hooks.json).
// Rules live in .agents/lib/doc-reminder-rules.mjs; this file only speaks the Cursor protocol.
import { docReminder } from '../../.agents/lib/doc-reminder-rules.mjs';

const text = docReminder(process.cwd());
if (text) process.stdout.write(`${JSON.stringify({ followup_message: text })}\n`);