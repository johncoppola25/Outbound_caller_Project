import { useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, LayoutDashboard, Megaphone, Users, Phone,
  PhoneCall, Calendar, BarChart3, ClipboardCheck, Settings, Upload, UserPlus,
  Play, Square, Edit3, Trash2, Eye, Bell, Search, Zap, CheckCircle2, AlertCircle,
  ArrowRight, MessageSquare, Target, Shield
} from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    icon: Zap,
    iconBg: '#eef2ff',
    iconBorder: '#c7d2fe',
    iconColor: '#4f46e5',
    title: 'Getting Started',
    subtitle: 'Set up your account and make your first call',
    content: [
      {
        heading: 'Initial Setup',
        steps: [
          'Log in with your admin credentials on the Login page.',
          'Navigate to Settings to verify your Telnyx API connection is active (green "Connected" status).',
          'Ensure you have at least one phone number listed under "Phone Numbers" in Settings.',
          'Set up your webhook URL using ngrok so call data flows back to the app (instructions are on the Settings page).',
          'Create your first campaign from the Campaigns page.',
          'Add contacts to the campaign — either manually or by uploading a CSV file.',
          'Open the campaign, select a contact, and press the Call button to start your first AI call.'
        ]
      },
      {
        heading: 'System Requirements',
        steps: [
          'A Telnyx account with a funded balance and at least one phone number.',
          'An active ngrok tunnel (or public URL) pointing to your server for webhooks.',
          'A modern web browser (Chrome, Firefox, Edge, or Safari).'
        ]
      }
    ]
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    iconBg: '#ecfdf5',
    iconBorder: '#a7f3d0',
    iconColor: '#059669',
    title: 'Dashboard',
    subtitle: 'Your command center for all activity',
    content: [
      {
        heading: 'Overview',
        steps: [
          'The Dashboard is the first page you see after logging in. It shows a real-time snapshot of all your outreach activity.',
          'Key metrics displayed: Total Campaigns, Total Contacts, Total Calls, and Appointments Booked.',
          'The "Recent Calls" section shows your latest 10 calls with their status and outcome.',
          'Data updates in real-time via WebSocket — no need to refresh the page.'
        ]
      },
      {
        heading: 'Metrics Explained',
        steps: [
          'Hot / Warm / Cold Lead indicators show how engaged your contacts are based on call outcomes.',
          'Conversion Rate shows the percentage of calls that resulted in a booked appointment.',
          'Cost tracking shows how much you\'ve spent on calls (from your Telnyx balance).'
        ]
      }
    ]
  },
  {
    id: 'campaigns',
    icon: Megaphone,
    iconBg: '#fef2f2',
    iconBorder: '#fecaca',
    iconColor: '#dc2626',
    title: 'Campaigns',
    subtitle: 'Create and manage your outreach campaigns',
    content: [
      {
        heading: 'Creating a Campaign',
        steps: [
          'Click the "+ New Campaign" button on the Campaigns page.',
          'Choose a template (Pre-Foreclosure Outreach, Cash Buyer / Quick Close, or Follow-Up / Re-engagement) or start with a blank prompt.',
          'Fill in the campaign details: Name, Type, AI Bot Name, Voice, Phone Number, and AI Prompt.',
          'The AI Prompt defines what the AI says during calls. Use placeholders like {{contact.first_name}}, {{contact.property_address}}, {{bot_name}}, and {{callback_phone}} — they get replaced automatically with real data.',
          'Click "Create Campaign" to save. An AI assistant is automatically created on Telnyx for this campaign.'
        ]
      },
      {
        heading: 'Campaign Settings',
        steps: [
          'Voice: Choose from available Telnyx voices (e.g., Telnyx.Natasha, Telnyx.Marcus). Each voice has a different tone and style.',
          'Voice Speed: Adjust how fast the AI speaks (0.8 = slower, 1.0 = normal, 1.2 = faster).',
          'Bot Name: The name the AI introduces itself as during calls.',
          'Caller ID: The phone number that shows up on the contact\'s phone when the AI calls.',
          'You can edit any of these settings later from the Campaign Detail page by clicking the Edit button.'
        ]
      },
      {
        heading: 'Managing Campaigns',
        steps: [
          'Click any campaign card to open its detail page with contacts, call history, and stats.',
          'Use the search bar to quickly find campaigns by name or type.',
          'Delete a campaign by clicking the trash icon on the campaign card (this cannot be undone).'
        ]
      }
    ]
  },
  {
    id: 'contacts',
    icon: Users,
    iconBg: '#fffbeb',
    iconBorder: '#fde68a',
    iconColor: '#d97706',
    title: 'Contacts',
    subtitle: 'Add, import, and manage your contact lists',
    content: [
      {
        heading: 'Adding Contacts Manually',
        steps: [
          'Go to the Contacts page and click "+ Add Contact".',
          'Fill in: First Name, Last Name, Phone Number (required), Email, Property Address, and Notes.',
          'Select which campaign this contact belongs to.',
          'Click "Add Contact" to save.'
        ]
      },
      {
        heading: 'Importing Contacts via CSV',
        steps: [
          'Click the "Upload CSV" button on either the Contacts page or within a Campaign Detail page.',
          'Select a campaign to assign the contacts to.',
          'Upload a CSV file with columns: first_name, last_name, phone, email, property_address, notes.',
          'The system will import all valid rows and show you how many were imported successfully.',
          'Duplicate phone numbers within the same campaign are automatically skipped.'
        ]
      },
      {
        heading: 'Managing Contacts',
        steps: [
          'Filter contacts by campaign or status (New, Called, Converted, Not Interested, Callback, DNC).',
          'Use the search bar to find contacts by name, phone, or email.',
          'Click the eye icon to view full contact details.',
          'Click the edit icon to update contact information.',
          'Click the trash icon to delete a contact.',
          'Use bulk actions: select multiple contacts with checkboxes, then delete or reset their status.'
        ]
      },
      {
        heading: 'Contact Statuses',
        steps: [
          'New: Contact has not been called yet.',
          'Called: Contact was called but no specific outcome was recorded.',
          'Converted: Contact booked an appointment.',
          'Not Interested: Contact declined the offer.',
          'Callback: Contact requested a callback at a later time.',
          'DNC: Contact asked to be placed on the Do-Not-Call list.'
        ]
      }
    ]
  },
  {
    id: 'making-calls',
    icon: Phone,
    iconBg: '#ecfdf5',
    iconBorder: '#a7f3d0',
    iconColor: '#059669',
    title: 'Making Calls',
    subtitle: 'How to initiate and monitor AI calls',
    content: [
      {
        heading: 'Calling a Single Contact',
        steps: [
          'Open a campaign from the Campaigns page.',
          'In the Contacts section, find the contact you want to call.',
          'Click the green phone icon (Call) button next to their name.',
          'The AI will call the contact\'s phone number using your campaign\'s caller ID.',
          'The call status will update in real-time: Queued → Ringing → In Progress → Completed.',
          'Once connected, the AI introduces itself using your campaign\'s greeting and follows the AI prompt script.'
        ]
      },
      {
        heading: 'Running a Full Campaign',
        steps: [
          'On the Campaign Detail page, click the "Start Campaign" button to auto-dial all contacts in sequence.',
          'The system calls contacts one at a time, waiting for each call to complete before dialing the next.',
          'Click "Stop Campaign" at any time to pause the auto-dialer.',
          'Contacts that have already been called or are on the DNC list are automatically skipped.'
        ]
      },
      {
        heading: 'What Happens During a Call',
        steps: [
          'The AI greets the contact by first name and introduces itself.',
          'It follows your campaign\'s AI prompt to have a natural conversation.',
          'The AI asks one question at a time and waits for the person to respond before continuing.',
          'Based on the conversation, the AI can: book an appointment, mark as not interested, schedule a callback, or end the call.',
          'After saying goodbye, the AI automatically hangs up.',
          'All call data (duration, outcome, transcript) is saved and viewable on the Calls page.'
        ]
      },
      {
        heading: 'Call Outcomes',
        steps: [
          'Appointment Scheduled: The contact agreed to a meeting. Details appear on the Appointments page.',
          'Not Interested: The contact declined. They are marked accordingly so you don\'t call them again in auto-dial.',
          'Callback Requested: The contact asked to be called back later. Appears on the Callbacks page.',
          'No Answer / Voicemail: The contact didn\'t pick up. The AI may leave a voicemail per your prompt.',
          'Completed: The call ended normally without a specific outcome action.'
        ]
      }
    ]
  },
  {
    id: 'appointments',
    icon: Calendar,
    iconBg: '#eef2ff',
    iconBorder: '#c7d2fe',
    iconColor: '#4f46e5',
    title: 'Appointments',
    subtitle: 'View and manage booked appointments',
    content: [
      {
        heading: 'Viewing Appointments',
        steps: [
          'The Appointments page shows all appointments booked by the AI during calls.',
          'Each appointment card shows: Contact name, phone, email, property address, scheduled date/time, and campaign name.',
          'A red badge on the Appointments sidebar icon shows how many active appointments you have.',
          'Click the copy icon to copy all contact details to your clipboard for easy pasting.'
        ]
      },
      {
        heading: 'Completing a Meeting',
        steps: [
          'After you\'ve had the meeting with the contact, click "Complete Meeting" on the appointment card.',
          'Enter the outcome (e.g., "listed property", "signed contract", "needs follow-up").',
          'Add any notes from the meeting.',
          'Click "Save" — the appointment moves to the Meeting History page.'
        ]
      }
    ]
  },
  {
    id: 'callbacks',
    icon: PhoneCall,
    iconBg: '#fef2f2',
    iconBorder: '#fecaca',
    iconColor: '#dc2626',
    title: 'Callbacks',
    subtitle: 'Manage callback requests from contacts',
    content: [
      {
        heading: 'How Callbacks Work',
        steps: [
          'When a contact tells the AI they\'d like to be called back later, the AI records it as a callback request.',
          'The callback appears on the Callbacks page with the contact\'s preferred time (if mentioned).',
          'You can view the original call details by clicking through to the call record.',
          'Call the contact back manually or schedule them in a new campaign when ready.'
        ]
      }
    ]
  },
  {
    id: 'calls',
    icon: Phone,
    iconBg: '#f5f3ff',
    iconBorder: '#ddd6fe',
    iconColor: '#7c3aed',
    title: 'Calls & Call Detail',
    subtitle: 'Review call history, transcripts, and recordings',
    content: [
      {
        heading: 'Calls Page',
        steps: [
          'The Calls page lists all calls made across all campaigns.',
          'Each row shows: Contact name, phone, campaign, status, outcome, duration, and timestamp.',
          'Filter by status (all, completed, in-progress, failed) to find specific calls.',
          'Click any call row to open the full Call Detail page.'
        ]
      },
      {
        heading: 'Call Detail Page',
        steps: [
          'View the complete call transcript — everything the AI and the contact said.',
          'See call metadata: duration, start/end times, outcome, and Telnyx call ID.',
          'If a recording is available, you can play it back directly in the browser.',
          'Review the AI\'s actions during the call (appointment booked, callback scheduled, etc.).'
        ]
      }
    ]
  },
  {
    id: 'analytics',
    icon: BarChart3,
    iconBg: '#ecfdf5',
    iconBorder: '#a7f3d0',
    iconColor: '#059669',
    title: 'Analytics',
    subtitle: 'Track performance and ROI across campaigns',
    content: [
      {
        heading: 'Key Metrics',
        steps: [
          'Total Calls: The total number of calls made across all campaigns.',
          'Conversion Rate: Percentage of calls that resulted in appointments.',
          'Average Call Duration: How long your AI calls typically last.',
          'Cost Per Call: Average cost per call from your Telnyx balance.',
          'Campaign-level breakdowns let you compare performance across different campaigns.'
        ]
      },
      {
        heading: 'Charts & Graphs',
        steps: [
          'Call volume over time shows trends in your outreach activity.',
          'Outcome distribution shows the breakdown of call results (appointment, not interested, callback, etc.).',
          'Use these insights to optimize your AI prompts and targeting.'
        ]
      }
    ]
  },
  {
    id: 'meeting-history',
    icon: ClipboardCheck,
    iconBg: '#fffbeb',
    iconBorder: '#fde68a',
    iconColor: '#d97706',
    title: 'Meeting History',
    subtitle: 'Review completed meetings and outcomes',
    content: [
      {
        heading: 'Overview',
        steps: [
          'Meeting History shows all appointments that have been marked as "completed".',
          'Each entry shows: Contact details, meeting outcome, notes, and the original call information.',
          'Use this to track your conversion pipeline — from AI call to actual meeting to deal closed.',
          'Filter and search through past meetings to find specific records.'
        ]
      }
    ]
  },
  {
    id: 'settings',
    icon: Settings,
    iconBg: '#f5f3ff',
    iconBorder: '#ddd6fe',
    iconColor: '#7c3aed',
    title: 'Settings',
    subtitle: 'Configure your system and API connections',
    content: [
      {
        heading: 'API Connection',
        steps: [
          'Shows whether your Telnyx API key is valid and connected.',
          'Displays your current Telnyx account balance.',
          'If disconnected, check your TELNYX_API_KEY environment variable on the server.'
        ]
      },
      {
        heading: 'Phone Numbers',
        steps: [
          'Lists all phone numbers on your Telnyx account.',
          'Shows the status (active/inactive) and connection name for each number.',
          'To add new numbers, purchase them through the Telnyx portal (link provided on the page).'
        ]
      },
      {
        heading: 'AI Assistants',
        steps: [
          'Shows all AI assistants created for your campaigns.',
          'Each campaign automatically creates its own assistant with the voice and model settings you chose.',
          'The system creates a temporary assistant for each individual call to ensure the correct contact name is used.'
        ]
      },
      {
        heading: 'Webhook Setup',
        steps: [
          'Webhooks are required for the app to receive call status updates, transcripts, and AI actions.',
          'Run ngrok on your machine: ngrok http 3001',
          'Copy the HTTPS URL ngrok gives you.',
          'Set your Telnyx webhook URL to: https://YOUR-NGROK-URL/api/webhooks/telnyx',
          'Use the "Test Webhook" button to verify it\'s working.',
          'Important: When ngrok restarts, you get a new URL and must update it in Telnyx.'
        ]
      },
      {
        heading: 'Do-Not-Call (DNC) List',
        steps: [
          'Add phone numbers that should never be called.',
          'If a contact says "don\'t call me again" during a call, the AI automatically adds them.',
          'You can manually add or remove numbers from the DNC list.',
          'Contacts on the DNC list are skipped during auto-dial campaigns.'
        ]
      }
    ]
  },
  {
    id: 'notifications',
    icon: Bell,
    iconBg: '#fef2f2',
    iconBorder: '#fecaca',
    iconColor: '#dc2626',
    title: 'Notifications',
    subtitle: 'Stay updated on appointments, callbacks, and calls',
    content: [
      {
        heading: 'How Notifications Work',
        steps: [
          'Click the bell icon in the top-right of the sidebar to open the notification panel.',
          'Notifications are generated for: New appointments (green), Callback requests (yellow), and Completed calls (blue).',
          'Unread notifications show a blue dot. The bell icon shows a red badge with the unread count.',
          'Click any notification to jump directly to the related call detail page.',
          'Click "Mark all read" to clear the unread indicators.'
        ]
      }
    ]
  },
  {
    id: 'ai-prompts',
    icon: MessageSquare,
    iconBg: '#ecfdf5',
    iconBorder: '#a7f3d0',
    iconColor: '#059669',
    title: 'Writing AI Prompts',
    subtitle: 'Tips for creating effective AI call scripts',
    content: [
      {
        heading: 'Available Placeholders',
        steps: [
          '{{contact.first_name}} — Contact\'s first name',
          '{{contact.last_name}} — Contact\'s last name',
          '{{contact.phone}} — Contact\'s phone number',
          '{{contact.email}} — Contact\'s email address',
          '{{contact.property_address}} — Contact\'s property address',
          '{{contact.notes}} — Any notes attached to the contact',
          '{{bot_name}} — The AI bot\'s name (set in campaign settings)',
          '{{callback_phone}} — Your callback phone number (campaign caller ID)'
        ]
      },
      {
        heading: 'Best Practices',
        steps: [
          'Start with a clear identity: Tell the AI who it is and who it\'s calling on behalf of.',
          'Define the call flow: Opening → Discovery → Value Proposition → Close → Goodbye.',
          'Keep instructions concise — shorter prompts lead to faster AI response times.',
          'Include objection handling: Tell the AI how to respond to common pushbacks.',
          'Always include a closing flow: What to say before hanging up.',
          'Test your prompt by calling yourself first before running a full campaign.'
        ]
      },
      {
        heading: 'What the System Adds Automatically',
        steps: [
          'Hangup behavior: The AI is instructed to use the hangup tool after saying goodbye.',
          'Conversation pacing: The AI asks one question at a time and waits for a response.',
          'Contact context: The contact\'s name and details are injected before the call starts.',
          'You do NOT need to include these in your prompt — they\'re added automatically.'
        ]
      }
    ]
  },
  {
    id: 'troubleshooting',
    icon: AlertCircle,
    iconBg: '#fffbeb',
    iconBorder: '#fde68a',
    iconColor: '#d97706',
    title: 'Troubleshooting',
    subtitle: 'Common issues and how to fix them',
    content: [
      {
        heading: 'Call Status Stuck on "Ringing"',
        steps: [
          'This usually means webhooks aren\'t reaching your server.',
          'Check that ngrok is running and the URL is correct in your Telnyx settings.',
          'The app has a 5-second polling fallback, but real-time updates require working webhooks.',
          'Go to Settings and click "Test Webhook" to verify.'
        ]
      },
      {
        heading: 'AI Not Responding or Slow Response',
        steps: [
          'The AI model processes the prompt before responding. Shorter prompts = faster responses.',
          'Check your internet connection and Telnyx API status.',
          'Verify the campaign\'s AI assistant was created successfully (check Settings → AI Assistants).'
        ]
      },
      {
        heading: 'AI Saying the Wrong Name',
        steps: [
          'The system creates a fresh AI assistant for each call with the correct contact name.',
          'If you hear the wrong name, check that the contact\'s name is correctly saved in the Contacts page.',
          'Edit the contact to fix their name, then try calling again.'
        ]
      },
      {
        heading: 'AI Not Hanging Up After Goodbye',
        steps: [
          'The AI is instructed to use the hangup tool after saying goodbye.',
          'If the AI doesn\'t hang up, the call will eventually timeout and end automatically.',
          'This can happen if the AI thinks the conversation isn\'t finished. Check your prompt for clear closing instructions.'
        ]
      },
      {
        heading: 'No Sound / AI Not Hearing Responses',
        steps: [
          'The system uses Deepgram Nova-2 for transcription with optimized settings.',
          'Speak clearly and wait a moment after the AI finishes before responding.',
          'Background noise can interfere — the AI has noise suppression but very loud environments may cause issues.',
          'Check that your phone has good signal strength.'
        ]
      },
      {
        heading: 'CSV Import Not Working',
        steps: [
          'Ensure your CSV has the correct column headers: first_name, last_name, phone, email, property_address, notes.',
          'Phone numbers should include the country code (e.g., +12125551234 or just 2125551234 for US numbers).',
          'The file must be a .csv format — Excel files (.xlsx) are not supported.',
          'Check for extra spaces or special characters in the phone number column.'
        ]
      },
      {
        heading: 'API Connection Failed',
        steps: [
          'Verify your TELNYX_API_KEY environment variable is set correctly on the server.',
          'Check that your Telnyx account is active and has a positive balance.',
          'Restart the server after changing environment variables.',
          'Go to Settings and click "Refresh" to re-test the connection.'
        ]
      }
    ]
  }
];

export default function UserManual() {
  const [expandedSections, setExpandedSections] = useState(new Set(['getting-started']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(sections.map(s => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  const filteredSections = searchQuery.trim()
    ? sections.filter(s => {
        const q = searchQuery.toLowerCase();
        if (s.title.toLowerCase().includes(q)) return true;
        if (s.subtitle.toLowerCase().includes(q)) return true;
        return s.content.some(c =>
          c.heading.toLowerCase().includes(q) ||
          c.steps.some(step => step.toLowerCase().includes(q))
        );
      })
    : sections;

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    marginBottom: '12px',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease'
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '11px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
          }}>
            <BookOpen style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>
              User Manual
            </h1>
            <p style={{ color: '#4b5563', marginTop: '2px', fontSize: '14px' }}>
              Everything you need to know about EstateReach AI Outreach
            </p>
          </div>
        </div>
      </div>

      {/* Search + Controls */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            width: '16px', height: '16px', color: '#9ca3af'
          }} />
          <input
            type="text"
            placeholder="Search the manual..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              background: '#ffffff', border: '1px solid #d1d5db',
              borderRadius: '10px', fontSize: '13px', outline: 'none', color: '#111827',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
        </div>
        <button
          onClick={expandAll}
          style={{
            padding: '10px 16px', background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            color: '#4b5563', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          style={{
            padding: '10px 16px', background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            color: '#4b5563', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          Collapse All
        </button>
      </div>

      {/* Quick Navigation */}
      <div style={{
        ...cardStyle, padding: '18px 22px', marginBottom: '20px',
        background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)',
        border: '1px solid #c7d2fe'
      }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Quick Navigation
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setExpandedSections(prev => new Set(prev).add(s.id));
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{
                padding: '6px 14px', background: '#ffffff', border: '1px solid #d1d5db',
                borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                color: '#374151', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#4f46e5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#d1d5db'; }}
            >
              <s.icon style={{ width: '13px', height: '13px' }} />
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* No Results */}
      {filteredSections.length === 0 && (
        <div style={{
          ...cardStyle, padding: '40px', textAlign: 'center'
        }}>
          <Search style={{ width: '32px', height: '32px', color: '#9ca3af', margin: '0 auto 12px' }} />
          <p style={{ color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>No results found for "{searchQuery}"</p>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>Try a different search term</p>
        </div>
      )}

      {/* Sections */}
      {filteredSections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const Icon = section.icon;
        return (
          <div key={section.id} id={`section-${section.id}`} style={cardStyle}>
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '18px 22px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left'
              }}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: section.iconBg, border: `1px solid ${section.iconBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon style={{ width: '18px', height: '18px', color: section.iconColor }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>
                  {section.title}
                </h2>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                  {section.subtitle}
                </p>
              </div>
              {isExpanded
                ? <ChevronDown style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
                : <ChevronRight style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
              }
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div style={{
                padding: '0 22px 20px',
                borderTop: '1px solid #f3f4f6'
              }}>
                {section.content.map((block, i) => (
                  <div key={i} style={{ marginTop: '18px' }}>
                    <h3 style={{
                      fontSize: '13px', fontWeight: '700', color: '#374151',
                      marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      <ArrowRight style={{ width: '14px', height: '14px', color: section.iconColor }} />
                      {block.heading}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px' }}>
                      {block.steps.map((step, j) => (
                        <div key={j} style={{
                          display: 'flex', gap: '10px', alignItems: 'flex-start',
                          fontSize: '13px', color: '#4b5563', lineHeight: '1.6'
                        }}>
                          <span style={{
                            minWidth: '20px', height: '20px', borderRadius: '10px',
                            background: '#f3f4f6', border: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: '700', color: '#6b7280',
                            flexShrink: 0, marginTop: '1px'
                          }}>
                            {j + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '28px 0 12px', color: '#9ca3af', fontSize: '12px'
      }}>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Zap style={{ width: '13px', height: '13px', color: '#4f46e5' }} />
          EstateReach AI Outreach Platform
        </p>
      </div>
    </div>
  );
}
