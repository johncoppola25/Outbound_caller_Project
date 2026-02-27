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
    
    const result = await telnyxRequest('/ai/assistants', 'POST', {
      name: campaign.name,
      instructions: instructionsToSend, // This should be the personalized prompt with name verification
      model: 'Qwen/Qwen3-235B-A22B',
      greeting: campaign.greeting || 'Hello,',
      
      // Voice settings - Telnyx NaturalHD
      voice_settings: voiceSettings,
      
      // Transcription - Deepgram Flux (requires 'en' not 'en-US')
      transcription: {
        model: 'deepgram/flux',
        language: 'en',
        settings: {
          eot_threshold: 0.7,
          eot_timeout_ms: 5000,
          eager_eot_threshold: 0.3
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
      
      // Interruption settings
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
    // Try PATCH first - this is safe and won't disrupt active calls
    const voiceName = getVoiceName(campaign.voice);
    const patchBody = {
      instructions: campaign.ai_prompt || 'You are a helpful AI assistant.',
      greeting: campaign.greeting || 'Hello,',
      voice_settings: {
        voice: voiceName,
        voice_speed: parseFloat(campaign.voice_speed) || 1.0,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    };
    
    // Only include name if provided
    if (campaign.name) patchBody.name = campaign.name;
    
    console.log('   PATCH body keys:', Object.keys(patchBody));
    console.log('   Voice:', voiceName);
    
    const result = await telnyxRequest(`/ai/assistants/${assistantId}`, 'PATCH', patchBody);
    console.log('✅ AI Assistant updated via PATCH (no disruption to active calls)');
    
    // Return with the same assistant ID (it didn't change)
    return { 
      extractedId: assistantId, 
      data: result.data || result 
    };
  } catch (patchError) {
    console.log('⚠️ PATCH failed:', patchError.message);
    console.log('   ⚠️ NOT deleting assistant to protect any active calls.');
    console.log('   Returning existing assistant ID - it will still work for calls.');
    
    // Return the existing assistant ID so calls can still proceed
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
    .replace(/\{Property\s*Address\}/gi, contact.property_address || '')
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
    
    // If we have contact data and campaign data, create a personalized assistant for this call
    if (callData.contact && callData.campaign) {
      console.log('📝 Creating personalized assistant for contact:', callData.contact.first_name, callData.contact.last_name);
      
      // Build contact name first
      const firstName = callData.contact.first_name || '';
      const lastName = callData.contact.last_name || '';
      const contactFullName = `${firstName} ${lastName}`.trim();
      const botName = callData.campaign.bot_name || 'Julia';
      
      // Replace ALL variables in the prompt and greeting
      // This handles [First Name], [Owner Name], [Your Name]/[Bot Name], {{contact.first_name}}, etc.
      let personalizedPrompt = replaceContactVariables(callData.campaign.ai_prompt, callData.contact, botName, callData.campaign);
      let personalizedGreeting = replaceContactVariables(callData.campaign.greeting, callData.contact, botName, callData.campaign);
      
      // Use the greeting EXACTLY as the user wrote it (with variables replaced)
      // DO NOT override or append anything to the greeting
      let updatedGreeting = personalizedGreeting;
      
      // Add context so the AI knows who it is and who it's calling
      let nameContext = '';
      if (contactFullName) {
        nameContext = `## YOUR IDENTITY & THIS CALL
Your name is ${botName}. Always refer to yourself as ${botName}.
The person you are calling is: "${contactFullName}" (first name: "${firstName}", last name: "${lastName}")
You are ${botName} - you are NOT ${contactFullName}.

`;
      }
      
      // Put contact context FIRST, then the original prompt (with variables already replaced)
      const promptWithNameVerification = nameContext + personalizedPrompt;
      
      console.log('   Personalized greeting (EXACT - no override):', updatedGreeting);
      console.log('   Contact Full Name:', contactFullName);
      console.log('   Prompt preview (first 200 chars):', promptWithNameVerification.substring(0, 200));
      
      // Update the EXISTING assistant with personalized prompt/greeting for this call
      // This reuses the same assistant instead of creating a new one each time
      if (assistantIdToUse) {
        try {
          console.log('🔄 Updating EXISTING assistant for this call with personalized name verification...');
          console.log('   Using Assistant ID:', assistantIdToUse);
          console.log('   Contact Name:', contactFullName);
          console.log('   Updated Greeting:', updatedGreeting);
          
          // Try to update the existing assistant with PATCH
          const updateResult = await telnyxRequest(`/ai/assistants/${assistantIdToUse}`, 'PATCH', {
            instructions: promptWithNameVerification, // Personalized prompt with name verification
            greeting: updatedGreeting // Personalized greeting with contact name
          });
          
          console.log('✅ Successfully updated existing assistant with personalized prompt');
          console.log('   Assistant now knows the contact name is:', contactFullName);
        } catch (updateError) {
          console.error('⚠️ Could not update existing assistant, using original:', updateError.message);
          console.error('   Error details:', updateError);
          // Continue with original assistant - it will still work, just may not have the personalized greeting
        }
      } else {
        console.log('⚠️ No assistant ID available, cannot personalize for this call');
      }
    }
    
    // Build request
    const requestBody = {
      From: fromNumber,
      To: callData.to,
      AIAssistantId: assistantIdToUse
    };
    
    // Add ClientState with call_id so webhooks can match the call
    if (callData.call_id) {
      requestBody.ClientState = Buffer.from(JSON.stringify({ call_id: callData.call_id })).toString('base64');
      console.log('   Client State includes call_id:', callData.call_id);
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
      console.log('   Dynamic Variables: contact.first_name =', callData.contact.first_name);
    }
    
    // Use the TeXML AI Calls endpoint for AI-powered calls
    const result = await telnyxRequest(`/texml/ai_calls/${texmlAppId}`, 'POST', requestBody);
    
    console.log('✅ AI Call initiated:', result.data?.call_sid || result.call_sid);
    return result;
  } catch (error) {
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
  listPhoneNumbers,
  testConnection,
  createCallControlApp,
  listCallControlApps,
  assignPhoneNumberToApp
};
