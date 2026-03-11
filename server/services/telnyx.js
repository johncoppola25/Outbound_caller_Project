import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __telnyx_dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__telnyx_dirname, '..', '..', '.env') });

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

console.log('🔑 Telnyx API Key configured:', TELNYX_API_KEY ? 'Yes (starts with ' + TELNYX_API_KEY.substring(0, 10) + '...)' : 'NO - MISSING!');

// Helper function for API calls
export async function telnyxRequest(endpoint, method = 'GET', body = null) {
  console.log(`📡 Telnyx API Request: ${method} ${endpoint}`);
  
  if (!TELNYX_API_KEY) {
    throw new Error('TELNYX_API_KEY is not configured in .env file');
  }
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TELNYX_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log('📤 Request body:', JSON.stringify(body, null, 2));
  }
  
  try {
    const response = await fetch(`${TELNYX_API_BASE}${endpoint}`, options);
    const responseText = await response.text();
    
    console.log(`📥 Response status: ${response.status}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('📥 Response (not JSON):', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      console.error('❌ Telnyx API Error:', JSON.stringify(data, null, 2));
      throw new Error(data.errors?.[0]?.detail || data.errors?.[0]?.title || `Telnyx API error: ${response.status}`);
    }
    
    console.log('✅ Telnyx API Success');
    return data;
  } catch (error) {
    console.error('❌ Telnyx Request Failed:', error.message);
    throw error;
  }
}

// Map voice option to Telnyx voice name
function getVoiceName(voiceOption) {
  const voiceMap = {
    'astra': 'Telnyx.NaturalHD.astra',
    'andromeda': 'Telnyx.NaturalHD.andromeda',
    'luna': 'Telnyx.NaturalHD.luna',
    'athena': 'Telnyx.NaturalHD.athena',
    'orion': 'Telnyx.NaturalHD.orion',
    'perseus': 'Telnyx.NaturalHD.perseus',
    'atlas': 'Telnyx.NaturalHD.atlas',
    'helios': 'Telnyx.NaturalHD.helios',
    // Legacy mappings
    'female': 'Telnyx.NaturalHD.astra',
    'male': 'Telnyx.NaturalHD.orion'
  };
  return voiceMap[voiceOption] || 'Telnyx.NaturalHD.astra';
}

// Build the tools array for an AI assistant
function buildAssistantTools(webhookBaseUrl, phoneNumber) {
  const tools = [
    // Hangup tool - lets the AI end the call gracefully
    {
      type: 'hangup',
      hangup: {
        description: 'End and hang up the call. Use this when: (1) the conversation is complete and you have said goodbye, (2) the contact is not interested and you have acknowledged it, (3) the contact asks you to stop calling, (4) you have confirmed an appointment and said goodbye, (5) you reached voicemail and left a message, (6) there is no response after two attempts to greet the caller.'
      }
    }
  ];

  // Add webhook tools only if we have a public URL for callbacks
  if (webhookBaseUrl) {
    tools.push({
      type: 'webhook',
      webhook: {
        name: 'schedule_appointment',
        description: 'Schedule a 15-minute appointment/consultation with Kenny. Call this when the contact agrees to a meeting time. You MUST collect a preferred date and time before calling this.',
        url: `${webhookBaseUrl}/api/webhooks/ai-tool/schedule_appointment`,
        method: 'POST',
        headers: [
          { name: 'Content-Type', value: 'application/json' }
        ],
        body_parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The appointment date, e.g. "2026-03-15" or "tomorrow" or "next Tuesday"' },
            time: { type: 'string', description: 'The appointment time, e.g. "2:00 PM" or "morning"' },
            contact_name: { type: 'string', description: 'The name of the person on the call' },
            notes: { type: 'string', description: 'Any relevant notes about the appointment' }
          },
          required: ['date', 'time', 'contact_name']
        },
        async: false,
        timeout_ms: 5000
      }
    });

    tools.push({
      type: 'webhook',
      webhook: {
        name: 'mark_not_interested',
        description: 'Mark this contact as not interested. Call this when the contact clearly states they are not interested, before hanging up.',
        url: `${webhookBaseUrl}/api/webhooks/ai-tool/mark_not_interested`,
        method: 'POST',
        headers: [
          { name: 'Content-Type', value: 'application/json' }
        ],
        body_parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Why they are not interested' },
            add_to_dnc: { type: 'boolean', description: 'True if they asked to never be called again' },
            contact_name: { type: 'string', description: 'The name of the person on the call' }
          },
          required: ['reason']
        },
        async: false,
        timeout_ms: 5000
      }
    });

    tools.push({
      type: 'webhook',
      webhook: {
        name: 'request_callback',
        description: 'The contact wants to be called back at a different time. Call this when they say "call me later" or give a preferred callback time.',
        url: `${webhookBaseUrl}/api/webhooks/ai-tool/request_callback`,
        method: 'POST',
        headers: [
          { name: 'Content-Type', value: 'application/json' }
        ],
        body_parameters: {
          type: 'object',
          properties: {
            preferred_time: { type: 'string', description: 'When they want to be called back' },
            contact_name: { type: 'string', description: 'The name of the person' }
          },
          required: ['preferred_time']
        },
        async: false,
        timeout_ms: 5000
      }
    });
  }

  // Transfer to live agent (Kenny)
  if (phoneNumber) {
    tools.push({
      type: 'transfer',
      transfer: {
        targets: [
          { name: 'Kenny - Live Agent', to: phoneNumber }
        ],
        from: phoneNumber
      }
    });
  }

  return tools;
}

// Create an AI Assistant for a campaign with full settings
export async function createAIAssistant(campaign) {
  console.log('🤖 Creating AI Assistant for campaign:', campaign.name);
  
  // Get the TeXML App ID and phone number
  const texmlAppId = process.env.TELNYX_TEXML_APP_ID || '2883792385622410406';
  const phoneNumber = campaign.caller_id || process.env.TELNYX_PHONE_NUMBER || '+17324028535';
  
  // Determine voice based on campaign settings
  const voiceName = getVoiceName(campaign.voice);
  console.log('   Voice:', voiceName);
  console.log('   Greeting:', campaign.greeting || 'Hello,');
  console.log('   Time Limit:', campaign.time_limit_secs || 1800, 'seconds');
  console.log('   Background Audio:', campaign.background_audio || 'silence');
  
  const voiceSpeed = parseFloat(campaign.voice_speed) || 1.0;
  const voiceSettings = {
    voice: voiceName,
    voice_speed: voiceSpeed,
    similarity_boost: 0.5,
    style: 0.0,
    use_speaker_boost: true
  };
  
  // Add background audio if not silence
  const bgAudio = campaign.background_audio || 'silence';
  if (bgAudio !== 'silence') {
    voiceSettings.background_audio = {
      type: 'predefined_media',
      value: bgAudio, // 'office', 'cafe', 'outdoors'
      volume: 0.4
    };
  }
  
  try {
    // Telnyx AI Assistant API with full configuration
    const instructionsToSend = campaign.ai_prompt || 'You are a helpful AI assistant.';
    console.log('📤 Sending instructions to Telnyx (first 300 chars):', instructionsToSend.substring(0, 300));

    // Build tools array
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || process.env.RENDER_EXTERNAL_URL || '';
    const tools = buildAssistantTools(webhookBaseUrl, phoneNumber);
    console.log('   Tools configured:', tools.map(t => t.type).join(', '));

    // Append call flow instructions to ensure proper hangup and pacing behavior
    const callFlowInstructions = `

## CRITICAL CALL BEHAVIOR RULES
- When the conversation is done, say a brief goodbye like "Have a great day, bye!" and then IMMEDIATELY end the call. Do NOT say the word "hangup" or any tool name out loud.
- If the contact says goodbye or any farewell, say a quick goodbye and end the call instantly.
- If the contact is not interested, say "No problem, have a great day!" and end the call.
- If the contact asks you to stop calling, apologize briefly and end the call.
- If you reach voicemail, leave a brief message and end the call.
- NEVER stay on the line in silence. If no response after your greeting, try once more then end the call.
- After confirming an appointment, repeat the details, say thank you and goodbye, then end the call.
- NEVER say words like "hangup", "end call", "disconnect", or any technical terms out loud. Just say goodbye naturally and the call will end automatically.

## CONVERSATION PACING RULES
- Ask only ONE question at a time, then STOP and WAIT for the person to respond.
- Never ask multiple questions in a single turn.
- After asking a question, be silent and let the person answer fully before speaking again.
- Keep your responses short and conversational, not scripted.
- Listen carefully to what they say before moving to the next topic.`;

    const fullInstructions = instructionsToSend + callFlowInstructions;

    const result = await telnyxRequest('/ai/assistants', 'POST', {
      name: campaign.name,
      instructions: fullInstructions,
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
      greeting: campaign.greeting || 'Hello,',

      // Tools - hangup, transfer, webhooks for scheduling
      tools,

      // Voice settings - Telnyx NaturalHD
      voice_settings: voiceSettings,

      // Transcription - Deepgram Flux (requires 'en' not 'en-US')
      transcription: {
        model: 'deepgram/flux',
        language: 'en',
        settings: {
          eot_threshold: 0.5,
          eot_timeout_ms: 2000,
          eager_eot_threshold: 0.2
        }
      },

      // Telephony settings - link to TeXML app
      telephony_settings: {
        default_texml_app_id: texmlAppId,
        noise_suppression: 'deepfilternet',
        time_limit_secs: campaign.time_limit_secs || 1800
      },

      // Enable telephony feature
      enabled_features: ['telephony'],

      // Interruption settings - slightly longer wait to reduce talking over people
      interruption_settings: {
        enable: true,
        start_speaking_plan: {
          wait_seconds: 0.4
        }
      },

      // Voicemail detection (if enabled)
      ...(campaign.voicemail_detection ? {
        voicemail_detection: {
          enabled: true,
          message: campaign.voicemail_message || `Hi {{contact.first_name}}, this is a message from our office. Please call us back at your earliest convenience. Thank you!`
        }
      } : {})
    });
    
    console.log('📦 Full Telnyx Response:', JSON.stringify(result, null, 2));
    
    // Try to find the ID in different possible locations
    const assistantId = result.data?.id || result.id || result.data?.assistant_id || result.assistant_id;
    console.log('✅ AI Assistant created with ID:', assistantId);
    
    return { ...result, extractedId: assistantId };
  } catch (error) {
    console.error('❌ Failed to create AI Assistant:', error.message);
    throw error;
  }
}

// Delete an AI Assistant
export async function deleteAIAssistant(assistantId) {
  console.log('🗑️ Deleting AI Assistant:', assistantId);
  
  try {
    await telnyxRequest(`/ai/assistants/${assistantId}`, 'DELETE');
    console.log('✅ AI Assistant deleted');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete AI Assistant:', error.message);
    throw error;
  }
}

// Update an existing AI Assistant (PATCH first, fallback to delete+recreate)
export async function updateAIAssistant(assistantId, campaign) {
  console.log('🔄 Updating AI Assistant:', assistantId);
  console.log('   Strategy: PATCH existing (safe for active calls)');

  try {
    const voiceName = getVoiceName(campaign.voice);
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || process.env.RENDER_EXTERNAL_URL || '';
    const phoneNumber = campaign.caller_id || process.env.TELNYX_PHONE_NUMBER || '+17324028535';
    const tools = buildAssistantTools(webhookBaseUrl, phoneNumber);

    const callFlowInstructions = `

## CRITICAL CALL BEHAVIOR RULES
- When the conversation is done, say a brief goodbye like "Have a great day, bye!" and then IMMEDIATELY end the call. Do NOT say the word "hangup" or any tool name out loud.
- If the contact says goodbye or any farewell, say a quick goodbye and end the call instantly.
- If the contact is not interested, say "No problem, have a great day!" and end the call.
- If the contact asks you to stop calling, apologize briefly and end the call.
- If you reach voicemail, leave a brief message and end the call.
- NEVER stay on the line in silence. If no response after your greeting, try once more then end the call.
- After confirming an appointment, repeat the details, say thank you and goodbye, then end the call.
- NEVER say words like "hangup", "end call", "disconnect", or any technical terms out loud. Just say goodbye naturally and the call will end automatically.

## CONVERSATION PACING RULES
- Ask only ONE question at a time, then STOP and WAIT for the person to respond.
- Never ask multiple questions in a single turn.
- After asking a question, be silent and let the person answer fully before speaking again.
- Keep your responses short and conversational, not scripted.
- Listen carefully to what they say before moving to the next topic.`;

    const patchBody = {
      instructions: (campaign.ai_prompt || 'You are a helpful AI assistant.') + callFlowInstructions,
      greeting: campaign.greeting || 'Hello,',
      tools,
      voice_settings: {
        voice: voiceName,
        voice_speed: parseFloat(campaign.voice_speed) || 1.0,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      },
      interruption_settings: {
        enable: true,
        start_speaking_plan: {
          wait_seconds: 0.4
        }
      }
    };

    if (campaign.name) patchBody.name = campaign.name;

    console.log('   PATCH body keys:', Object.keys(patchBody));
    console.log('   Voice:', voiceName);
    console.log('   Tools:', tools.map(t => t.type).join(', '));

    const result = await telnyxRequest(`/ai/assistants/${assistantId}`, 'PATCH', patchBody);
    console.log('✅ AI Assistant updated via PATCH (no disruption to active calls)');

    return {
      extractedId: assistantId,
      data: result.data || result
    };
  } catch (patchError) {
    console.log('⚠️ PATCH failed:', patchError.message);
    console.log('   Returning existing assistant ID - it will still work for calls.');

    return {
      extractedId: assistantId,
      data: { id: assistantId }
    };
  }
}

// List existing AI Assistants
export async function listAIAssistants() {
  console.log('📋 Listing AI Assistants...');
  try {
    const result = await telnyxRequest('/ai/assistants', 'GET');
    console.log('✅ Found assistants:', result.data?.length || 0);
    return result;
  } catch (error) {
    console.error('❌ Failed to list assistants:', error.message);
    throw error;
  }
}

// Format phone for the AI to say clearly (e.g. 732-402-8535)
function formatPhoneForSpeech(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone;
}

// Helper function to replace contact variables in text
function replaceContactVariables(text, contact, botName, campaign) {
  if (!text) return text;
  
  const firstName = contact?.first_name || '';
  const lastName = contact?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const aiName = botName || 'Julia';
  const callbackPhone = formatPhoneForSpeech(
    campaign?.caller_id || process.env.TELNYX_PHONE_NUMBER || '908-309-1156'
  );
  
  let result = (text || '')
    // Callback/callback number - what the AI should say when telling them to call back
    .replace(/\{\{callback_phone\}\}/g, callbackPhone)
    .replace(/\[Callback\s*Phone\]/gi, callbackPhone)
    .replace(/\[Callback\s*Number\]/gi, callbackPhone)
    // Replace {{contact.xxx}} format
    .replace(/\{\{contact\.first_name\}\}/g, firstName)
    .replace(/\{\{contact\.last_name\}\}/g, lastName)
    .replace(/\{\{contact\.phone\}\}/g, contact?.phone || '')
    .replace(/\{\{contact\.email\}\}/g, contact?.email || '')
    .replace(/\{\{contact\.property_address\}\}/g, contact?.property_address || '')
    .replace(/\{\{contact\.notes\}\}/g, contact?.notes || '')
    // CONTACT variables only (the person being called)
    .replace(/\[Owner\s*Name\]/gi, fullName)        // [Owner Name] → contact full name
    .replace(/\[Owner\s*First\s*Name\]/gi, firstName) // [Owner First Name] → contact first name
    .replace(/\[Owner\s*Last\s*Name\]/gi, lastName)   // [Owner Last Name] → contact last name
    .replace(/\[First\s*Name\]/gi, firstName)          // [First Name] → contact first name
    .replace(/\[Last\s*Name\]/gi, lastName)            // [Last Name] → contact last name
    .replace(/\[Full\s*Name\]/gi, fullName)            // [Full Name] → contact full name
    .replace(/\[Property\s*Address\]/gi, contact?.property_address || '')
    .replace(/\[Phone\]/gi, contact?.phone || '')
    .replace(/\[Email\]/gi, contact?.email || '')
    // {curly brace} contact variables
    .replace(/\{First\s*name\}/gi, firstName)
    .replace(/\{Last\s*Name\}/gi, lastName)
    .replace(/\{Owner\s*Name\}/gi, fullName)
    .replace(/\{Full\s*Name\}/gi, fullName)
    .replace(/\{Property\s*Address\}/gi, contact?.property_address || '')
    // AI caller / bot name replacements (uses campaign's bot_name)
    .replace(/\[Your\s*Name\]/gi, aiName)
    .replace(/\[Bot\s*Name\]/gi, aiName)
    .replace(/\[Agent\s*Name\]/gi, aiName)
    .replace(/\[AI\s*Name\]/gi, aiName)
    .replace(/\[Name\]/gi, aiName)
    // Remove stage directions (things the AI shouldn't say out loud)
    .replace(/\(Pause\s+for\s+confirmation[^)]*\)/gi, '')
    .replace(/\(Pause\s+and\s+allow\s+response[^)]*\)/gi, '')
    .replace(/\(Pause\s+for\s+response[^)]*\)/gi, '')
    .replace(/\(Pause\s+and\s+confirm[^)]*\)/gi, '')
    .replace(/do\s+NOT\s+say\s+this\s+out\s+loud/gi, '');
  
  return result;
}

// Initiate an outbound AI call using TeXML AI Calls endpoint
export async function initiateOutboundCall(callData) {
  console.log('📞 Initiating AI outbound call to:', callData.to);
  
  // Sanitize phone number - remove duplicate + signs and ensure proper format
  let fromNumber = callData.from || process.env.TELNYX_PHONE_NUMBER || '+17324028535';
  fromNumber = fromNumber.replace(/^\++/, '+'); // Replace multiple leading + with single +
  
  const texmlAppId = process.env.TELNYX_TEXML_APP_ID || '2883792385622410406';
  
  console.log('   From:', fromNumber);
  console.log('   To:', callData.to);
  console.log('   AI Assistant ID:', callData.assistant_id);
  console.log('   TeXML App ID:', texmlAppId);
  console.log('   Contact Data:', callData.contact ? 'Yes' : 'No');
  
  try {
    let assistantIdToUse = callData.assistant_id;
    let tempAssistantId = null; // Track if we created a temp assistant to clean up later

    // Create a FRESH temporary assistant for each call with personalized greeting/prompt
    // This prevents the previous contact's name from leaking into the next call
    if (callData.contact && callData.campaign) {
      console.log('📝 Creating temporary assistant for contact:', callData.contact.first_name, callData.contact.last_name);

      const firstName = callData.contact.first_name || '';
      const lastName = callData.contact.last_name || '';
      const contactFullName = `${firstName} ${lastName}`.trim();
      const botName = callData.campaign.bot_name || 'Julia';

      // Replace ALL variables in the prompt and greeting
      let personalizedPrompt = replaceContactVariables(callData.campaign.ai_prompt, callData.contact, botName, callData.campaign);

      // Override greeting to use first name only for the "may I speak with" opener
      let updatedGreeting = firstName
        ? `Hi, may I speak with ${firstName} please?`
        : replaceContactVariables(callData.campaign.greeting, callData.contact, botName, callData.campaign);

      // Add context so the AI knows who it is and who it's calling
      let nameContext = '';
      if (contactFullName) {
        nameContext = `## YOUR IDENTITY & THIS CALL
Your name is ${botName}. Always refer to yourself as ${botName}.
The person you are calling is: "${firstName}".
IMPORTANT: Only use their FIRST NAME "${firstName}" when addressing them. NEVER say their last name or full name.
You are ${botName} - you are NOT ${firstName}.

## CALL OPENING FLOW - READ THIS CAREFULLY
The greeting has ALREADY asked "may I speak with ${firstName}?" - you do NOT need to ask again.
When the person says "yes", "speaking", "this is him/her", or anything confirming their identity:
- Do NOT ask for their name again. Do NOT say "may I speak with" again. They already confirmed.
- Immediately introduce yourself: "Great, hi ${firstName}, this is ${botName}..." and state why you are calling.
- Keep it natural and conversational. Be brief. Do NOT repeat the name verification.
- Respond QUICKLY - do not pause for a long time before responding.

`;
      }

      const fullPrompt = nameContext + personalizedPrompt;

      const callFlowRules = `

## CRITICAL CALL BEHAVIOR RULES
- When the conversation is done, say a brief goodbye like "Have a great day, bye!" and then IMMEDIATELY end the call. Do NOT say the word "hangup" or any tool name out loud.
- If the contact says goodbye or any farewell, say a quick goodbye and end the call instantly.
- If the contact is not interested, say "No problem, have a great day!" and end the call.
- If the contact asks you to stop calling, apologize briefly and end the call.
- If you reach voicemail, leave a brief message and end the call.
- NEVER stay on the line in silence. If no response after your greeting, try once more then end the call.
- After confirming an appointment, repeat the details, say thank you and goodbye, then end the call.
- NEVER say words like "hangup", "end call", "disconnect", or any technical terms out loud. Just say goodbye naturally and the call will end automatically.

## CONVERSATION PACING RULES
- Ask only ONE question at a time, then STOP and WAIT for the person to respond.
- Never ask multiple questions in a single turn.
- After asking a question, be silent and let the person answer fully before speaking again.
- Keep your responses short and conversational, not scripted.
- Listen carefully to what they say before moving to the next topic.`;

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || process.env.RENDER_EXTERNAL_URL || '';
      const callTools = buildAssistantTools(webhookBaseUrl, fromNumber);
      const voiceName = getVoiceName(callData.campaign.voice);

      try {
        console.log('🆕 Creating NEW temporary assistant for this call...');
        console.log('   Contact:', contactFullName);
        console.log('   Greeting:', updatedGreeting);

        const newAssistant = await telnyxRequest('/ai/assistants', 'POST', {
          name: `Call - ${contactFullName || 'Unknown'} - ${new Date().toISOString().slice(0, 16)}`,
          instructions: fullPrompt + callFlowRules,
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          greeting: updatedGreeting,
          tools: callTools,
          voice_settings: {
            voice: voiceName,
            voice_speed: parseFloat(callData.campaign.voice_speed) || 1.0,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          },
          transcription: {
            model: 'deepgram/flux',
            language: 'en',
            settings: {
              eot_threshold: 0.5,
              eot_timeout_ms: 2000,
              eager_eot_threshold: 0.2
            }
          },
          telephony_settings: {
            default_texml_app_id: texmlAppId,
            noise_suppression: 'deepfilternet',
            time_limit_secs: 1800
          },
          enabled_features: ['telephony'],
          interruption_settings: {
            enable: true,
            start_speaking_plan: {
              wait_seconds: 0.4
            }
          }
        });

        tempAssistantId = newAssistant.data?.id || newAssistant.id || newAssistant.data?.assistant_id;
        if (tempAssistantId) {
          assistantIdToUse = tempAssistantId;
          console.log('✅ Temporary assistant created:', tempAssistantId);
        } else {
          console.warn('⚠️ Could not extract assistant ID from response, using campaign assistant');
        }
      } catch (createError) {
        console.error('⚠️ Could not create temp assistant, falling back to campaign assistant:', createError.message);
        // Fall back to the campaign's shared assistant
      }
    }

    // Build request
    const requestBody = {
      From: fromNumber,
      To: callData.to,
      AIAssistantId: assistantIdToUse
    };
    
    // Add ClientState with call_id (and temp assistant ID for cleanup on hangup)
    if (callData.call_id) {
      const stateObj = { call_id: callData.call_id };
      if (tempAssistantId) stateObj.temp_assistant_id = tempAssistantId;
      requestBody.ClientState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      console.log('   Client State:', JSON.stringify(stateObj));
    }

    // Also send DynamicVariables as backup (in case Telnyx uses them)
    if (callData.contact) {
      requestBody.DynamicVariables = JSON.stringify({
        contact: {
          first_name: callData.contact.first_name || '',
          last_name: callData.contact.last_name || '',
          phone: callData.contact.phone || '',
          email: callData.contact.email || '',
          property_address: callData.contact.property_address || '',
          notes: callData.contact.notes || ''
        }
      });
    }

    // Use the TeXML AI Calls endpoint for AI-powered calls
    const result = await telnyxRequest(`/texml/ai_calls/${texmlAppId}`, 'POST', requestBody);

    console.log('✅ AI Call initiated:', result.data?.call_sid || result.call_sid);
    if (tempAssistantId) {
      console.log('   Temp assistant to cleanup on hangup:', tempAssistantId);
    }
    return result;
  } catch (error) {
    // If call failed and we created a temp assistant, clean it up
    if (tempAssistantId) {
      try {
        await telnyxRequest(`/ai/assistants/${tempAssistantId}`, 'DELETE');
        console.log('🗑️ Cleaned up temp assistant after call failure:', tempAssistantId);
      } catch (e) { /* ignore cleanup errors */ }
    }
    console.error('❌ Failed to initiate AI call:', error.message);
    throw error;
  }
}

// Update assistant with personalized prompt for a specific call (PATCH only - never delete during active calls)
async function updateAssistantForCall(assistantId, campaign) {
  console.log('🔄 Updating assistant with personalized prompt...');
  console.log('   Assistant ID:', assistantId);
  console.log('   Prompt preview (first 200 chars):', (campaign.ai_prompt || '').substring(0, 200));
  console.log('   Greeting:', campaign.greeting);
  
  try {
    // Use PATCH only - NEVER delete an assistant that might be in use by an active call
    const result = await telnyxRequest(`/ai/assistants/${assistantId}`, 'PATCH', {
      instructions: campaign.ai_prompt || 'You are a helpful AI assistant.',
      greeting: campaign.greeting || 'Hello,'
    });
    
    console.log('✅ Assistant updated with personalized prompt via PATCH');
    return { extractedId: assistantId, data: result.data || result };
  } catch (patchError) {
    console.error('⚠️ PATCH failed:', patchError.message);
    console.log('   ⚠️ NOT deleting assistant to protect active calls. Will continue with existing assistant.');
    return { extractedId: assistantId };
  }
}

// Start AI conversation on answered call
export async function startAIConversation(callControlId, assistantId, context) {
  console.log('🎙️ Starting AI conversation on call:', callControlId);
  
  try {
    const result = await telnyxRequest(`/calls/${callControlId}/actions/gather_using_ai`, 'POST', {
      assistant_id: assistantId,
      assistant_context: JSON.stringify(context),
      voice: 'female',
      language: 'en-US'
    });
    
    console.log('✅ AI conversation started');
    return result;
  } catch (error) {
    console.error('❌ Failed to start AI conversation:', error.message);
    throw error;
  }
}

// Get call recording
export async function getCallRecording(recordingId) {
  try {
    const result = await telnyxRequest(`/recordings/${recordingId}`);
    return result;
  } catch (error) {
    console.error('Error fetching recording:', error);
    throw error;
  }
}

// List phone numbers available for outbound calls
export async function listPhoneNumbers() {
  console.log('📱 Listing phone numbers...');
  try {
    const result = await telnyxRequest('/phone_numbers?filter[status]=active');
    console.log('✅ Found phone numbers:', result.data?.length || 0);
    return result.data || [];
  } catch (error) {
    console.error('❌ Failed to list phone numbers:', error.message);
    throw error;
  }
}

// Test API connection
export async function testConnection() {
  console.log('🧪 Testing Telnyx API connection...');
  try {
    const result = await telnyxRequest('/balance');
    console.log('✅ API connection successful! Balance:', result.data?.balance);
    return { success: true, balance: result.data?.balance };
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Create a Call Control Application
export async function createCallControlApp(name, webhookUrl) {
  console.log('📞 Creating Call Control App:', name);
  
  try {
    const result = await telnyxRequest('/call_control_applications', 'POST', {
      application_name: name,
      webhook_event_url: webhookUrl,
      webhook_event_failover_url: webhookUrl,
      webhook_api_version: '2',
      active: true,
      anchorsite_override: 'Latency',
      dtmf_type: 'RFC 2833'
    });
    
    console.log('✅ Call Control App created:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to create Call Control App:', error.message);
    throw error;
  }
}

// List Call Control Applications
export async function listCallControlApps() {
  console.log('📋 Listing Call Control Apps...');
  try {
    const result = await telnyxRequest('/call_control_applications');
    console.log('✅ Found apps:', result.data?.length || 0);
    return result.data || [];
  } catch (error) {
    console.error('❌ Failed to list Call Control Apps:', error.message);
    throw error;
  }
}

// Assign phone number to Call Control App
export async function assignPhoneNumberToApp(phoneNumberId, connectionId) {
  console.log('📱 Assigning phone number to Call Control App...');
  try {
    const result = await telnyxRequest(`/phone_numbers/${phoneNumberId}`, 'PATCH', {
      connection_id: connectionId
    });
    console.log('✅ Phone number assigned');
    return result;
  } catch (error) {
    console.error('❌ Failed to assign phone number:', error.message);
    throw error;
  }
}

// Fetch call details from Telnyx by call control ID
export async function getCallDetails(callControlId) {
  console.log('📞 Fetching call details from Telnyx:', callControlId);
  try {
    const result = await telnyxRequest(`/calls/${callControlId}`, 'GET');
    return result;
  } catch (error) {
    console.log('  Call details not available:', error.message);
    return null;
  }
}

// Fetch AI assistant conversation history
export async function getAssistantConversations(assistantId) {
  console.log('💬 Fetching conversations for assistant:', assistantId);
  try {
    const result = await telnyxRequest(`/ai/assistants/${assistantId}/conversations`, 'GET');
    return result;
  } catch (error) {
    console.log('  Conversations not available:', error.message);
    return null;
  }
}

// Fetch full conversation transcript for a call
// Tries multiple strategies: call_control_id, phone number, assistant_id + time match
export async function getConversationTranscript(callControlId, contactPhone, assistantId, callCreatedAt) {
  console.log('📝 Fetching AI conversation transcript...');
  console.log('   call_control_id:', callControlId);
  console.log('   contactPhone:', contactPhone);
  console.log('   assistantId:', assistantId);

  try {
    let conversationId = null;

    // Strategy 1: Find by call_control_id in metadata
    if (callControlId) {
      try {
        const byCallId = await telnyxRequest(
          `/ai/conversations?metadata->call_control_id=eq.${encodeURIComponent(callControlId)}&limit=1`, 'GET'
        );
        if (byCallId?.data?.length > 0) {
          conversationId = byCallId.data[0].id;
          console.log('   Found conversation by call_control_id:', conversationId);
        }
      } catch (e) {
        console.log('   call_control_id lookup failed:', e.message);
      }
    }

    // Strategy 2: Find by contact phone number (most recent)
    if (!conversationId && contactPhone) {
      try {
        const byPhone = await telnyxRequest(
          `/ai/conversations?metadata->telnyx_end_user_target=eq.${encodeURIComponent(contactPhone)}&order=last_message_at.desc&limit=5`, 'GET'
        );
        if (byPhone?.data?.length > 0) {
          // If we have a call created_at, find the conversation closest in time
          if (callCreatedAt) {
            let callTime = new Date(String(callCreatedAt).replace(' ', 'T')).getTime();
            if (isNaN(callTime)) callTime = 0;

            let bestMatch = byPhone.data[0];
            let bestDiff = Infinity;
            for (const conv of byPhone.data) {
              const convTime = new Date(conv.created_at).getTime();
              const diff = Math.abs(convTime - callTime);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestMatch = conv;
              }
            }
            conversationId = bestMatch.id;
            console.log('   Found conversation by phone + time match:', conversationId);
          } else {
            conversationId = byPhone.data[0].id;
            console.log('   Found conversation by phone (most recent):', conversationId);
          }
        }
      } catch (e) {
        console.log('   Phone lookup failed:', e.message);
      }
    }

    // Strategy 3: Find by assistant_id + recent time
    if (!conversationId && assistantId) {
      try {
        const byAssistant = await telnyxRequest(
          `/ai/conversations?metadata->assistant_id=eq.${encodeURIComponent(assistantId)}&order=last_message_at.desc&limit=10`, 'GET'
        );
        if (byAssistant?.data?.length > 0) {
          if (callCreatedAt) {
            let callTime = new Date(String(callCreatedAt).replace(' ', 'T')).getTime();
            if (isNaN(callTime)) callTime = 0;

            let bestMatch = null;
            let bestDiff = Infinity;
            for (const conv of byAssistant.data) {
              const convTime = new Date(conv.created_at).getTime();
              const diff = Math.abs(convTime - callTime);
              // Only match if within 30 minutes of the call
              if (diff < 1800000 && diff < bestDiff) {
                bestDiff = diff;
                bestMatch = conv;
              }
            }
            if (bestMatch) {
              conversationId = bestMatch.id;
              console.log('   Found conversation by assistant + time match:', conversationId);
            }
          } else {
            conversationId = byAssistant.data[0].id;
            console.log('   Found conversation by assistant (most recent):', conversationId);
          }
        }
      } catch (e) {
        console.log('   Assistant lookup failed:', e.message);
      }
    }

    if (!conversationId) {
      console.log('   No conversation found for this call');
      return null;
    }

    // Fetch the full message transcript
    console.log('   Fetching messages for conversation:', conversationId);
    const messages = await telnyxRequest(
      `/ai/conversations/${conversationId}/messages?order=created_at.asc&limit=200`, 'GET'
    );

    if (!messages?.data?.length) {
      console.log('   Conversation found but no messages');
      return null;
    }

    console.log(`   Found ${messages.data.length} messages`);

    // Format messages into a readable transcript with speaker labels
    const transcriptLines = [];
    for (const msg of messages.data) {
      if (!msg.text && !msg.tool_calls) continue;

      if (msg.role === 'assistant') {
        if (msg.text) transcriptLines.push(`AI: ${msg.text}`);
      } else if (msg.role === 'user') {
        if (msg.text) transcriptLines.push(`Contact: ${msg.text}`);
      }
      // Skip tool messages - they're internal function calls
    }

    if (transcriptLines.length === 0) {
      console.log('   Messages found but no text content');
      return null;
    }

    console.log(`   Formatted ${transcriptLines.length} transcript lines`);
    return {
      conversationId,
      transcript: transcriptLines.join('\n'),
      messageCount: messages.data.length
    };
  } catch (error) {
    console.error('   Transcript fetch error:', error.message);
    return null;
  }
}

// Fetch call recordings from Telnyx
export async function getCallRecordings(callControlId) {
  console.log('🎙️ Fetching recordings for call:', callControlId);
  try {
    const result = await telnyxRequest(`/recordings?filter[call_leg_id]=${callControlId}`, 'GET');
    return result;
  } catch (error) {
    console.log('  Recordings not available:', error.message);
    return null;
  }
}

export default {
  createAIAssistant,
  updateAIAssistant,
  listAIAssistants,
  initiateOutboundCall,
  startAIConversation,
  getCallRecording,
  getCallDetails,
  getAssistantConversations,
  getCallRecordings,
  getConversationTranscript,
  listPhoneNumbers,
  testConnection,
  createCallControlApp,
  listCallControlApps,
  assignPhoneNumberToApp
};
