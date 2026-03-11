import express from 'express';
import { telnyxRequest } from '../services/telnyx.js';

const router = express.Router();

// All the manual content as context for the AI
const MANUAL_CONTEXT = `You are a helpful assistant for the EstateReach AI Outreach platform. Answer the user's question based ONLY on the information below. Keep answers concise and actionable. Use numbered steps when explaining how to do something. If you don't know the answer from the manual content, say so.

# EstateReach User Manual

## GETTING STARTED
1. Log in with your admin credentials on the Login page.
2. Go to Settings to verify your Telnyx API connection is active (green "Connected" status).
3. Ensure you have at least one phone number listed under "Phone Numbers" in Settings.
4. Set up your webhook URL using ngrok so call data flows back to the app (instructions on Settings page).
5. Create your first campaign from the Campaigns page.
6. Add contacts to the campaign — manually or by uploading a CSV file.
7. Open the campaign, select a contact, and press the Call button.

Requirements: A Telnyx account with funded balance and phone number. An active ngrok tunnel for webhooks. A modern web browser.

## DASHBOARD
- First page after login. Real-time snapshot of all outreach activity.
- Key metrics: Total Campaigns, Total Contacts, Total Calls, Appointments Booked.
- Recent Calls section shows latest 10 calls with status and outcome.
- Data updates in real-time via WebSocket — no need to refresh.
- Hot/Warm/Cold Lead indicators show contact engagement based on call outcomes.
- Conversion Rate = percentage of calls resulting in a booked appointment.
- Cost tracking shows Telnyx call spend.

## CAMPAIGNS
### Creating a Campaign
1. Click "+ New Campaign" on the Campaigns page.
2. Choose a template (Pre-Foreclosure Outreach, Cash Buyer / Quick Close, Follow-Up / Re-engagement) or start blank.
3. Fill in: Name, Type, AI Bot Name, Voice, Phone Number, and AI Prompt.
4. The AI Prompt uses placeholders: {{contact.first_name}}, {{contact.last_name}}, {{contact.phone}}, {{contact.email}}, {{contact.property_address}}, {{contact.notes}}, {{bot_name}}, {{callback_phone}}.
5. Click "Create Campaign" to save. An AI assistant is auto-created on Telnyx.

### Campaign Settings
- Voice: Choose from Telnyx voices (e.g., Telnyx.Natasha, Telnyx.Marcus).
- Voice Speed: 0.8 = slower, 1.0 = normal, 1.2 = faster.
- Bot Name: The name the AI introduces itself as.
- Caller ID: The phone number that shows on the contact's phone.
- Edit settings later from Campaign Detail page using the Edit button.

### Managing Campaigns
- Click any campaign card to open its detail page.
- Search bar to find campaigns by name or type.
- Delete with trash icon on campaign card (cannot be undone).

## CONTACTS
### Adding Manually
1. Go to Contacts page, click "+ Add Contact".
2. Fill in: First Name, Last Name, Phone (required), Email, Property Address, Notes.
3. Select which campaign this contact belongs to.
4. Click "Add Contact" to save.

### CSV Import
1. Click "Upload CSV" on Contacts page or within a Campaign Detail page.
2. Select a campaign.
3. Upload CSV with columns: first_name, last_name, phone, email, property_address, notes.
4. System imports valid rows and shows count. Duplicates are skipped.

### Managing Contacts
- Filter by campaign or status (New, Called, Converted, Not Interested, Callback, DNC).
- Search by name, phone, or email.
- Eye icon = view details. Edit icon = update. Trash icon = delete.
- Bulk actions: select multiple with checkboxes, then delete or reset status.

### Contact Statuses
- New: Not called yet.
- Called: Called but no specific outcome.
- Converted: Booked an appointment.
- Not Interested: Declined.
- Callback: Requested callback.
- DNC: Asked for Do-Not-Call.

## MAKING CALLS
### Single Contact Call
1. Open a campaign from Campaigns page.
2. Find the contact in the Contacts section.
3. Click the green phone icon (Call) button.
4. AI calls using your campaign's caller ID.
5. Status updates: Queued → Ringing → In Progress → Completed.
6. AI introduces itself and follows your prompt script.

### Running a Full Campaign (Auto-Dial)
1. On Campaign Detail page, click "Start Campaign".
2. System calls contacts one at a time, waiting for each to complete.
3. Click "Stop Campaign" to pause.
4. Already-called contacts and DNC contacts are skipped.

### During a Call
- AI greets contact by first name, introduces itself.
- Follows your AI prompt for natural conversation.
- Asks one question at a time, waits for response.
- Can: book appointment, mark not interested, schedule callback, or end call.
- After goodbye, AI automatically hangs up.
- All data (duration, outcome, transcript) is saved.

### Call Outcomes
- Appointment Scheduled: Meeting booked → appears on Appointments page.
- Not Interested: Contact declined.
- Callback Requested: Appears on Callbacks page.
- No Answer / Voicemail: AI may leave voicemail per prompt.
- Completed: Normal end without specific action.

## APPOINTMENTS
- Shows all appointments booked by AI during calls.
- Each card: Contact name, phone, email, property, date/time, campaign.
- Red badge on sidebar shows active appointment count.
- Copy icon copies all contact details to clipboard.
- Complete Meeting: Enter outcome and notes → moves to Meeting History.

## CALLBACKS
- When contact asks to be called back, AI records it.
- Callback appears with preferred time if mentioned.
- Click through to see original call details.
- Call back manually or add to new campaign.

## CALLS & CALL DETAIL
- Calls page: all calls across all campaigns.
- Each row: Contact name, phone, campaign, status, outcome, duration, timestamp.
- Filter by status (all, completed, in-progress, failed).
- Call Detail: full transcript, metadata, duration, recording playback.

## ANALYTICS
- Total Calls, Conversion Rate, Average Duration, Cost Per Call.
- Campaign-level breakdowns for comparison.
- Call volume over time chart.
- Outcome distribution chart.

## MEETING HISTORY
- Shows completed appointments (marked done).
- Contact details, outcome, notes, original call info.
- Track pipeline: AI call → meeting → deal.

## SETTINGS
### API Connection: Shows Telnyx API status and balance.
### Phone Numbers: Lists active numbers, status, connection.
### AI Assistants: Shows campaign assistants with voice/model info.
### Webhook Setup:
1. Run: ngrok http 3001
2. Copy HTTPS URL.
3. Set webhook: https://YOUR-URL/api/webhooks/telnyx
4. Test with "Test Webhook" button.
5. New URL needed when ngrok restarts.
### DNC List: Add/remove numbers. AI auto-adds when requested. Skipped in auto-dial.

## NOTIFICATIONS
- Bell icon in sidebar top-right.
- Types: Appointments (green), Callbacks (yellow), Completed calls (blue).
- Blue dot = unread. Red badge = unread count.
- Click notification to jump to call detail.
- "Mark all read" clears indicators.

## WRITING AI PROMPTS
### Placeholders: {{contact.first_name}}, {{contact.last_name}}, {{contact.phone}}, {{contact.email}}, {{contact.property_address}}, {{contact.notes}}, {{bot_name}}, {{callback_phone}}
### Best Practices:
- Clear identity (who the AI is, who it represents).
- Define call flow: Opening → Discovery → Value → Close → Goodbye.
- Keep prompts concise (shorter = faster AI response).
- Include objection handling.
- Include closing flow.
- Test by calling yourself first.
### Auto-Added by System (don't include in prompt):
- Hangup behavior after goodbye.
- One-question-at-a-time pacing.
- Contact name/details injection.

## TROUBLESHOOTING
- Status stuck on "Ringing": Check ngrok is running, webhook URL is correct. Test with Settings button.
- Slow AI response: Keep prompts shorter. Check internet and Telnyx status.
- Wrong name: Check contact name in Contacts page, edit and try again.
- AI not hanging up: Call will timeout. Check prompt has clear closing instructions.
- No sound / AI not hearing: Speak clearly, wait after AI finishes. Check signal strength.
- CSV import failing: Check columns (first_name, last_name, phone, email, property_address, notes). Must be .csv not .xlsx.
- API connection failed: Check TELNYX_API_KEY env var. Check Telnyx balance. Restart server.`;

// POST /api/manual/ask
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await telnyxRequest('/ai/chat/completions', 'POST', {
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      messages: [
        { role: 'system', content: MANUAL_CONTEXT },
        { role: 'user', content: question.trim() }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const answer = response?.data?.choices?.[0]?.message?.content
      || response?.choices?.[0]?.message?.content
      || 'Sorry, I couldn\'t find an answer to that question. Try rephrasing or browse the manual sections below.';

    res.json({ answer });
  } catch (err) {
    console.error('Manual AI error:', err.message);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable. Please browse the manual sections below.' });
  }
});

export default router;
