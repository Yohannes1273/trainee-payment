import axios from 'axios';

// Lazy loader/helper for Telegram Bot Token
const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN || null;
const getGroupChatId = () => process.env.TELEGRAM_GROUP_CHAT_ID || null;

/**
 * Sends a message to a specific Telegram Chat ID
 */
export async function sendDirectMessage(chatId, text) {
  const token = getBotToken();
  console.log(`[Telegram Bot Service] Direct Notification to [${chatId || 'No Chat ID'}]:\n"${text}"`);
  
  if (!token || !chatId) {
    console.warn(`[Telegram Bot Service] Skip sending: Telegram Bot Token or Chat ID not configured.`);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
    return response.data.ok;
  } catch (error) {
    console.error(`[Telegram Bot Service] Error sending message to direct chat ${chatId}:`, error.message);
    return false;
  }
}

/**
 * Broadcasts a message to the college finance notification group
 */
export async function broadcastToGroup(text) {
  const token = getBotToken();
  const groupChatId = getGroupChatId();
  console.log(`[Telegram Bot Service] Group Broadcast Notification:\n"${text}"`);

  if (!token || !groupChatId) {
    console.warn(`[Telegram Bot Service] Skip broadcast: Telegram Bot Token or Group Chat ID not configured.`);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: groupChatId,
      text: text,
      parse_mode: 'HTML'
    });
    return response.data.ok;
  } catch (error) {
    console.error(`[Telegram Bot Service] Error broadcasting to group:`, error.message);
    return false;
  }
}

/**
 * Formats and delivers a professional financial compliance report to a section trainer
 */
export async function announceToTrainer(trainerChatId, summaryData) {
  console.log(`[Telegram Bot Service] Structuring trainer compliance alert for Chat [${trainerChatId}]`);
  
  let text = `<b>📈 Polytechnic Trainer Compliance Alert</b>\n\n`;
  text += `Dear Trainer <b>${summaryData.trainerName || 'Trainer'}</b>,\n`;
  text += `Here is the current financial compliance audit for your assigned section:\n\n`;
  
  text += `<b>🏢 Department:</b> ${summaryData.departmentName || 'N/A'}\n`;
  text += `<b>💼 Occupation:</b> ${summaryData.occupationName || 'N/A'}\n`;
  text += `<b>📐 Class:</b> Level ${summaryData.levelNumber} - Section ${summaryData.sectionName} (${summaryData.programName || 'N/A'})\n\n`;
  
  text += `<b>💰 Section Statistics:</b>\n`;
  text += `• Total Enrolled Trainees: <code>${summaryData.totalTrainees || 0}</code>\n`;
  text += `• Active Trainees: <code>${summaryData.activeTrainees || 0}</code>\n`;
  text += `• Total Approved Payments: <b>${summaryData.totalPaidAmount || 0} ETB</b>\n`;
  text += `• Paid Students: <code>${summaryData.paidTraineesCount || 0} / ${summaryData.totalTrainees || 0}</code>\n`;
  text += `• Compliance Ratio: <b>${summaryData.complianceRate || '0%'}</b>\n\n`;
  
  text += `<i>Notice: Please instruct unpaid trainees to settle their pending payment balances to prevent suspension.</i>`;

  return await sendDirectMessage(trainerChatId, text);
}

const botService = {
  sendDirectMessage,
  broadcastToGroup,
  announceToTrainer
};

export default botService;
