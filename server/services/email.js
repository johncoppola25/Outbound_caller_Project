const SMTP2GO_API = 'https://api.smtp2go.com/v3/email/send';
const API_KEY = process.env.SMTP2GO_API_KEY;
const FROM_EMAIL = 'noreply@outboundcaller.ai';
const FROM_NAME = 'OutReach AI';

async function sendEmail(to, subject, htmlBody, textBody) {
  if (!API_KEY) {
    console.log('SMTP2GO_API_KEY not set, skipping email to:', to);
    return null;
  }

  try {
    const res = await fetch(SMTP2GO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': API_KEY
      },
      body: JSON.stringify({
        sender: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html_body: htmlBody,
        text_body: textBody || ''
      })
    });

    const data = await res.json();
    if (data.data?.succeeded) {
      console.log(`Email sent to ${to}: ${subject}`);
    } else {
      console.error('Email send failed:', data);
    }
    return data;
  } catch (err) {
    console.error('Email error:', err.message);
    return null;
  }
}

// ── Email wrapper for consistent styling ──
function wrap(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0 20px;">
      <div style="display:inline-block;padding:12px 24px;background:#111827;border-radius:12px;">
        <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;">
          <span style="color:#ffffff;">Out</span><span style="color:#818cf8;">Reach</span><span style="color:#818cf8;font-weight:300;">AI</span>
        </span>
      </div>
    </div>
    <!-- Content Card -->
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;color:#9ca3af;font-size:12px;">
      <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} OutReach AI. All rights reserved.</p>
      <p style="margin:0;">AI-Powered Outbound Calling Platform</p>
    </div>
  </div>
</body>
</html>`;
}

// ── 1. Welcome Email ──
export async function sendWelcomeEmail(email, name) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#eef2ff;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        👋
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Welcome to OutReach AI!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your account is set up and ready to go.
    </p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 12px;">Here's how to get started:</h3>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <span style="width:24px;height:24px;border-radius:12px;background:#4f46e5;color:white;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">1</span>
        <p style="font-size:13px;color:#374151;margin:2px 0 0;"><strong>Pay the setup fee</strong> — Go to Billing and complete the one-time $500 setup.</p>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <span style="width:24px;height:24px;border-radius:12px;background:#4f46e5;color:white;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>
        <p style="font-size:13px;color:#374151;margin:2px 0 0;"><strong>Choose your plan</strong> — Starter ($200/mo), Professional ($400/mo), or Enterprise ($700/mo).</p>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <span style="width:24px;height:24px;border-radius:12px;background:#4f46e5;color:white;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">3</span>
        <p style="font-size:13px;color:#374151;margin:2px 0 0;"><strong>Buy a phone number</strong> — Pick an area code and purchase a number for your campaigns.</p>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="width:24px;height:24px;border-radius:12px;background:#4f46e5;color:white;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">4</span>
        <p style="font-size:13px;color:#374151;margin:2px 0 0;"><strong>Create a campaign & start calling</strong> — Upload contacts, set your AI script, and launch.</p>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/dashboard" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Go to Dashboard</a>
    </div>
  `);

  return sendEmail(email, 'Welcome to OutReach AI!', html);
}

// ── 2. Setup Fee Paid ──
export async function sendSetupFeePaidEmail(email, name) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#ecfdf5;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        ✅
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Setup Fee Confirmed!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your $500 setup fee has been processed successfully.
    </p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="font-size:14px;color:#065f46;font-weight:600;margin:0;">Payment of $500.00 received</p>
    </div>
    <p style="font-size:14px;color:#374151;text-align:center;margin:0 0 24px;line-height:1.6;">
      You can now choose your subscription plan. Head to Billing to pick Starter, Professional, or Enterprise.
    </p>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/billing" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Choose Your Plan</a>
    </div>
  `);

  return sendEmail(email, 'Setup Fee Confirmed - OutReach AI', html);
}

// ── 3. Subscription Activated ──
export async function sendSubscriptionActiveEmail(email, name, planName, planPrice) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#eef2ff;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        🚀
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">You're Subscribed!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your <strong>${planName}</strong> plan is now active.
    </p>
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;color:white;">
      <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Your Plan</p>
      <p style="font-size:28px;font-weight:800;margin:0 0 4px;">${planName}</p>
      <p style="font-size:16px;color:#a5b4fc;margin:0;">${planPrice}/month</p>
    </div>
    <p style="font-size:14px;color:#374151;text-align:center;margin:0 0 24px;line-height:1.6;">
      You now have full access to the platform. Add funds to your calling balance, buy a phone number, and create your first campaign.
    </p>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/dashboard" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Go to Dashboard</a>
    </div>
  `);

  return sendEmail(email, `${planName} Plan Activated - OutReach AI`, html);
}

// ── 4. Appointment Booked ──
export async function sendAppointmentBookedEmail(email, name, contactName, appointmentTime, campaignName) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#ecfdf5;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        📅
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">New Appointment Booked!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your AI just booked an appointment for you.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 2px;">Contact</p>
        <p style="font-size:16px;font-weight:700;color:#111827;margin:0;">${contactName}</p>
      </div>
      <div style="margin-bottom:12px;">
        <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 2px;">Appointment Time</p>
        <p style="font-size:16px;font-weight:700;color:#059669;margin:0;">${appointmentTime}</p>
      </div>
      <div>
        <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 2px;">Campaign</p>
        <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">${campaignName || 'N/A'}</p>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/appointments" style="display:inline-block;padding:14px 36px;background:#059669;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">View Appointments</a>
    </div>
  `);

  return sendEmail(email, `New Appointment: ${contactName} - OutReach AI`, html);
}

// ── 5. Low Balance Alert ──
export async function sendLowBalanceEmail(email, name, balance) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#fef2f2;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        ⚠️
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Low Balance Alert</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your calling balance is running low.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-size:12px;color:#991b1b;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Current Balance</p>
      <p style="font-size:36px;font-weight:800;color:#dc2626;margin:0;">$${balance.toFixed(2)}</p>
      <p style="font-size:13px;color:#991b1b;margin:8px 0 0;">${balance < 1 ? 'Your balance is empty! Add funds to continue making calls.' : 'Add funds soon to avoid interruptions to your campaigns.'}</p>
    </div>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/dashboard" style="display:inline-block;padding:14px 36px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Add Funds Now</a>
    </div>
  `);

  return sendEmail(email, 'Low Balance Alert - OutReach AI', html);
}

// ── 6. Funds Added ──
export async function sendFundsAddedEmail(email, name, amount, newBalance) {
  const html = wrap(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:14px;background:#ecfdf5;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
        💰
      </div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Funds Added!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your calling credits have been topped up.
    </p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div style="text-align:center;flex:1;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Added</p>
          <p style="font-size:24px;font-weight:800;color:#059669;margin:0;">+$${amount}</p>
        </div>
        <div style="text-align:center;flex:1;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">New Balance</p>
          <p style="font-size:24px;font-weight:800;color:#111827;margin:0;">$${newBalance.toFixed(2)}</p>
        </div>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="https://outboundcaller.ai/dashboard" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Go to Dashboard</a>
    </div>
  `);

  return sendEmail(email, `$${amount} Added to Your Balance - OutReach AI`, html);
}
