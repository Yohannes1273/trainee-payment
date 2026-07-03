import fs from 'fs';
import path from 'path';
import botService from './botService.js';

const CONFIG_PATH = path.join(process.cwd(), '.data', 'telegram_triggers.json');

const DEFAULT_TRIGGERS = {
  submit_slip: {
    enabled: true,
    traineeTemplate: "👋 Hello <b>{traineeName}</b>,\n\nWe have received your payment submission of <b>{amountPaid} ETB</b> for the <b>{programName}</b> program.\n\nOur Finance team is currently verifying the slip. We will notify you once it's approved!",
    staffTemplate: "🔔 <b>New Bank Slip Submitted</b>\n👤 Trainee: <b>{traineeName}</b> (Roll: {rollNumber})\n📂 Program: {programName} (Level {levelNumber})\n💰 Amount: <b>{amountPaid} ETB</b>\n🕒 Due Date: {dueDate}\n⚠️ Estimated Penalty: {penaltyAmount} ETB\n\nPlease review in the Finance Dashboard."
  },
  approve_payment: {
    enabled: true,
    traineeTemplate: "✅ <b>Payment Slip Verified & Approved!</b>\n\nCongratulations <b>{traineeName}</b>, your payment block is successfully settled.\n\n🧾 Receipt No: <b>{receiptNumber}</b>\n💰 Settlement Amount: <b>{amountPaid} ETB</b>\n⚠️ Overdue Late Penalty Paid: <b>{penaltyAmount} ETB</b>\n🔁 Routed Workflow: <i>{routedTo}</i>\n\nThank you!",
    staffTemplate: "🎉 <b>Payment Approved</b>\nStudent: <b>{traineeName}</b>\nAmount: <b>{amountPaid} ETB</b>\nReceipt generated: <b>{receiptNumber}</b> (Routed to: {routedTo})"
  },
  reject_payment: {
    enabled: true,
    traineeTemplate: "❌ <b>Payment Slip Rejected</b>\n\nHello <b>{traineeName}</b>, your payment of <b>{amountPaid} ETB</b> was rejected by Finance.\n\n<b>Reason:</b> <pre>{rejectionReason}</pre>\n\nPlease re-upload a clear and valid bank receipt slip.",
    staffTemplate: "⚠️ <b>Payment Rejected</b>\nUser: <b>{traineeName}</b>\nAmount: <b>{amountPaid} ETB</b>\nReason: <i>{rejectionReason}</i>"
  },
  auto_verify: {
    enabled: true,
    traineeTemplate: "✨ <b>Payment Slip Auto-Verified Successfully!</b>\n\nHello <b>{traineeName}</b>, your payment block is successfully settled by our automated AI verification.\n\n🧾 Receipt No: <b>{receiptNumber}</b>\n💰 Settlement Amount: <b>{amountPaid} ETB</b>\n⚠️ Overdue Late Penalty Paid: <b>{penaltyAmount} ETB</b>\n🔁 Routed Workflow: <i>{routedTo}</i>\n\nThank you!",
    staffTemplate: "✨ <b>Payment Auto-Verified</b>\nStudent: <b>{traineeName}</b>\nAmount: <b>{amountPaid} ETB</b>\nReceipt generated: <b>{receiptNumber}</b> (Routed to: {routedTo})\nAI Confidence: <b>High</b> (Ref: {aiReferenceNumber})"
  },
  flag_review: {
    enabled: true,
    traineeTemplate: "",
    staffTemplate: "⚠️ <b>Payment Flagged for Human Review</b>\nStudent: <b>{traineeName}</b>\nAmount Paid: <b>{amountPaid} ETB</b>\nAI Reason: <i>{aiReason}</i>"
  }
};

/**
 * Loads configured triggers from JSON database or returns defaults
 */
export function getTriggers() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[Telegram Trigger Service] Failed to read triggers config:', e);
      return DEFAULT_TRIGGERS;
    }
  }
  return DEFAULT_TRIGGERS;
}

/**
 * Saves configured triggers to JSON database
 */
export function saveTriggers(triggers) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(triggers, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[Telegram Trigger Service] Failed to save triggers config:', e);
    return false;
  }
}

/**
 * Formats a message template by merging variables
 */
export function formatMessage(template, variables) {
  if (!template) return '';
  let formatted = template;
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    formatted = formatted.replace(new RegExp(placeholder, 'g'), safeVal);
  }
  return formatted;
}

/**
 * Orchestrates a notification trigger for a specific verification event
 */
export async function triggerNotification(event, variables, traineeChatId = null, traineeAlertsEnabled = true) {
  const triggers = getTriggers();
  const config = triggers[event];
  
  if (!config) {
    console.warn(`[Telegram Trigger Service] Unknown notification event: ${event}`);
    return { success: false, reason: 'Unknown event' };
  }

  if (!config.enabled) {
    console.log(`[Telegram Trigger Service] Notification event [${event}] is disabled.`);
    return { success: true, bypassed: true, reason: 'Event disabled' };
  }

  const results = {
    directSent: false,
    groupSent: false
  };

  // 1. Deliver direct message to trainee if opt-in and Chat ID is configured
  if (config.traineeTemplate && traineeChatId && traineeAlertsEnabled) {
    const formattedTraineeMsg = formatMessage(config.traineeTemplate, variables);
    if (formattedTraineeMsg.trim()) {
      results.directSent = await botService.sendDirectMessage(traineeChatId, formattedTraineeMsg);
    }
  }

  // 2. Deliver group broadcast message to college finance team channel
  if (config.staffTemplate) {
    const formattedStaffMsg = formatMessage(config.staffTemplate, variables);
    if (formattedStaffMsg.trim()) {
      results.groupSent = await botService.broadcastToGroup(formattedStaffMsg);
    }
  }

  return {
    success: true,
    ...results
  };
}

const telegramTriggerService = {
  getTriggers,
  saveTriggers,
  formatMessage,
  triggerNotification,
  DEFAULT_TRIGGERS
};

export default telegramTriggerService;
