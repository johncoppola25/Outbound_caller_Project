import { telnyxRequest } from './telnyx.js';

export async function sendSMS(fromNumber, toNumber, message) {
  try {
    const response = await telnyxRequest('/messages', 'POST', {
      from: fromNumber,
      to: toNumber,
      text: message
    });
    console.log(`SMS sent to ${toNumber}`);
    return response;
  } catch (err) {
    console.error(`Failed to send SMS to ${toNumber}:`, err.message);
    return null;
  }
}

export function personalizeTemplate(template, contact, campaign) {
  if (!template) return null;
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name || '')
    .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    .replace(/\{\{bot_name\}\}/g, campaign.bot_name || 'Julia')
    .replace(/\{\{property_address\}\}/g, contact.property_address || '');
}
