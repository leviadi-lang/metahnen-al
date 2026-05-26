import { sendWhatsappMessageTool } from './send-whatsapp-message.js';
import { sendEmailTool } from './send-email.js';
import { createCrmProcessTool } from './create-crm-process.js';
import { updateCrmStatusTool } from './update-crm-status.js';
import { scheduleMeetingTool } from './schedule-meeting.js';
import { classifyDocumentTool } from './classify-document.js';
import { summarizeMeetingTool } from './summarize-meeting.js';
import { createFollowupTaskTool } from './create-followup-task.js';

/**
 * The shared tools registry, indexed by name. Each tool is a `betaZodTool` ready to pass
 * directly into `client.beta.messages.toolRunner()`.
 *
 * Tool names align with the system spec (src/prompts/*.md). The 7 tools from the
 * original spec plus `create_followup_task` added for MVP-1 (Lead Intake flow).
 */
export const TOOLS = {
  send_whatsapp_message: sendWhatsappMessageTool,
  send_email: sendEmailTool,
  create_crm_process: createCrmProcessTool,
  update_crm_status: updateCrmStatusTool,
  schedule_meeting: scheduleMeetingTool,
  classify_document: classifyDocumentTool,
  summarize_meeting: summarizeMeetingTool,
  create_followup_task: createFollowupTaskTool,
} as const;

export type ToolName = keyof typeof TOOLS;

/** All tools as an array — convenient for passing to the tool runner. */
export const ALL_TOOLS = Object.values(TOOLS);

/**
 * Resolve a subset of tools by name. Use this to scope which tools a given
 * sub-agent has access to (see src/agents/*\/tools.ts).
 */
export function toolsByName(names: readonly ToolName[]): typeof ALL_TOOLS {
  return names.map((n) => TOOLS[n]);
}
