# EstateReach - AI-Powered Real Estate Outbound Calling Platform

A comprehensive outbound calling platform for real estate agents using Telnyx AI Assistant for automated client outreach, appointment scheduling, and follow-up calls.

![EstateReach Dashboard](https://via.placeholder.com/800x400?text=EstateReach+Dashboard)

## Features

### 🏠 Campaign Management
- Create multiple AI-powered calling campaigns (appointment reminders, follow-ups, market updates)
- Customizable AI prompts for each campaign type
- Pre-built templates for quick setup
- Track campaign performance independently

### 👥 Contact Management
- CSV upload for bulk contact import
- Support for standard CSV formats (first_name, last_name, phone, email, property_address)
- Contact status tracking (pending, called, converted, not interested, callback)
- Per-campaign contact lists

### 📞 Call Tracking
- Real-time call status updates via WebSocket
- Call outcome tracking (appointment scheduled, callback requested, not interested, voicemail)
- Call duration and timing statistics
- Live activity feed

### 🎙️ Recordings & Transcripts
- Automatic call recording
- AI-generated transcripts
- Call summaries
- Playback directly in the app

### 📊 Analytics & Reporting
- Dashboard with key metrics
- Campaign performance comparison
- Conversion rate tracking
- Best hours to call analysis
- Outcome distribution charts

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket
- **Voice AI**: Telnyx AI Assistant API

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Telnyx account with:
  - API Key
  - Phone number(s) for outbound calling
  - AI Assistant access enabled

### Installation

1. Clone the repository:
```bash
cd "Outbound Caller"
```

2. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

3. Create environment file:
```bash
# Create .env file in root directory
TELNYX_API_KEY=your_telnyx_api_key_here
TELNYX_CONNECTION_ID=your_connection_id
WEBHOOK_BASE_URL=https://your-domain.com
PORT=3001
```

4. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:5173

### Telnyx Configuration

1. **Get your API Key**: Go to Telnyx Portal → API Keys → Create new key

2. **Set up a Connection**: 
   - Go to Voice → Connections
   - Create a new connection for outbound calling
   - Note the Connection ID

3. **Configure Webhooks**:
   - Set webhook URL to: `https://your-domain.com/api/webhooks/telnyx`
   - Enable events: call.initiated, call.answered, call.hangup, call.recording.saved, call.transcription

4. **Phone Numbers**:
   - Purchase or port phone numbers
   - Assign them to your voice connection

## Usage

### Creating a Campaign

1. Go to **Campaigns** → **New Campaign**
2. Choose a template or start from scratch
3. Fill in campaign details:
   - Name and description
   - Campaign type (reminder, follow-up, notification, outreach)
   - AI voice (male/female) and language
   - Caller ID (your Telnyx phone number)
4. Customize the AI prompt
5. Click **Create Campaign**

### Uploading Contacts

1. Navigate to your campaign
2. Click **Upload CSV**
3. Upload a CSV file with columns:
   - `first_name` (required)
   - `last_name` (required)
   - `phone` (required - format: 1234567890 or +11234567890)
   - `email` (optional)
   - `property_address` (optional)
   - `notes` (optional)

### Starting Calls

1. Go to your campaign page
2. Click **Start Campaign** to begin calling all pending contacts
3. Or click **Call Now** on individual contacts
4. Monitor progress in the **Calls** tab or dashboard

### Reviewing Calls

1. Click on any call to see details
2. Listen to recordings (if available)
3. Read transcripts
4. Update call outcomes manually if needed

## AI Prompt Best Practices

```
You are a friendly and professional real estate assistant calling on behalf of [AGENT NAME].

Your goal is to [PRIMARY OBJECTIVE].

Opening: "Hi, this is [NAME] calling from [COMPANY]. [REASON FOR CALL]."

Key tasks:
1. [First priority task]
2. [Second priority task]
3. [Third priority task]

If they want to schedule: use the schedule_appointment function
If they're not interested: acknowledge politely, use mark_not_interested function
If they want a callback: use request_callback function

Closing: "Thank you for your time. [APPROPRIATE FAREWELL]."

Tone: [Describe desired tone - warm, professional, enthusiastic, etc.]
```

## API Endpoints

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Contacts
- `GET /api/contacts/campaign/:id` - List contacts for campaign
- `POST /api/contacts/upload/:id` - Upload CSV contacts
- `POST /api/contacts` - Add single contact
- `DELETE /api/contacts/:id` - Delete contact

### Calls
- `GET /api/calls` - List all calls
- `GET /api/calls/campaign/:id` - List calls for campaign
- `POST /api/calls/initiate` - Start single call
- `POST /api/calls/start-campaign/:id` - Start campaign calling
- `POST /api/calls/stop-campaign/:id` - Stop campaign calling

### Statistics
- `GET /api/stats/dashboard` - Dashboard overview
- `GET /api/stats/campaign/:id` - Campaign-specific stats
- `GET /api/stats/analytics` - Detailed analytics

## Sample CSV Format

```csv
first_name,last_name,phone,email,property_address,notes
John,Smith,5551234567,john@email.com,123 Main St,Hot lead
Jane,Doe,5559876543,jane@email.com,456 Oak Ave,Follow up from open house
```

## License

MIT License - See LICENSE file for details.

## Support

For Telnyx API questions: [Telnyx Developer Docs](https://developers.telnyx.com/)

---

Built with ❤️ for Real Estate Professionals
