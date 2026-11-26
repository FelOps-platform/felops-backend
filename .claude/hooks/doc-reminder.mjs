#!/usr/bin/env node
// Claude Code Stop hook: non-blocking docs reminder (JSON systemMessage, exit 0).
// Rules live in .agents/lib/doc-reminder-rules.mjs; this file only speaks the Claude protocol.
import { docReminder } from '../../.agents/lib/doc-reminder-rules.mjs';

const text = docReminder(process.cwd());
if (text) process.stdout.write(`${JSON.stringify({ systemMessage: text })}\n`);