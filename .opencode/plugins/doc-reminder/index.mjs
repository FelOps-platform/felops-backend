// OpenCode context hook: appends the shared docs reminder to the system prompt once per session.
// Rules live in .agents/lib/doc-reminder-rules.mjs; this file only speaks the OpenCode protocol.
import { docReminder } from "../../../.agents/lib/doc-reminder-rules.mjs"

export default {
  id: "doc-reminder",
  async setup(ctx) {
    const reminded = new Set()
    const directory = ctx.location?.directory ?? process.cwd()

    await ctx.session.hook("context", (event) => {
      if (reminded.has(event.sessionID)) return
      const text = docReminder(directory, { includeBranch: true })
      if (!text) return
      event.system.push({ type: "text", text })
      reminded.add(event.sessionID)
    })

    return () => reminded.clear()
  },
}