const SMTP2GO_API = 'https://api.smtp2go.com/v3/email/send';
const API_KEY = process.env.SMTP2GO_API_KEY;
const FROM_EMAIL = 'noreply@outboundcaller.ai';
const FROM_NAME = 'OutReach AI';
const ADMIN_EMAIL = 'johnc@coppoladigital.com';

export async function sendEmail(to, subject, htmlBody, textBody) {
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

// ── Email wrapper — table-based for mobile + email client compatibility ──
function wrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OutReach AI</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111827;border-radius:12px;padding:14px 28px;">
                    <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Out</span><span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#818cf8;">Reach</span><span style="font-size:24px;font-weight:300;letter-spacing:-0.5px;color:#818cf8;">AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} OutReach AI. All rights reserved.</p>
              <p style="margin:0;">AI-Powered Outbound Calling Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function icon(emoji, bg) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
    <tr><td style="width:56px;height:56px;border-radius:14px;background-color:${bg};text-align:center;vertical-align:middle;font-size:28px;line-height:56px;">${emoji}</td></tr>
  </table>`;
}

function btn(href, label, bg = '#4f46e5') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;padding:14px 36px;background-color:${bg};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;mso-padding-alt:0;" target="_blank">${label}</a>
      </td>
    </tr>
  </table>`;
}

function step(num, title, desc) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
    <tr>
      <td width="32" valign="top" style="padding-right:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="width:28px;height:28px;border-radius:14px;background-color:#4f46e5;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">${num}</td></tr>
        </table>
      </td>
      <td valign="top" style="font-size:13px;color:#374151;line-height:1.5;padding-top:4px;">
        <strong>${title}</strong> — ${desc}
      </td>
    </tr>
  </table>`;
}

// ── 1. Welcome Email ──
export async function sendWelcomeEmail(email, name) {
  const html = wrap(`
    ${icon('👋', '#eef2ff')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Welcome to OutReach AI!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 28px;line-height:1.6;">
      Hey ${name}, your account is set up and ready to go.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 16px;">Here's how to get started:</p>
        ${step('1', 'Pay the setup fee', 'Go to Billing and complete the one-time $500 setup.')}
        ${step('2', 'Choose your plan', 'Starter ($200/mo), Professional ($400/mo), or Enterprise ($700/mo).')}
        ${step('3', 'Buy a phone number', 'Pick an area code and purchase a number for your campaigns.')}
        ${step('4', 'Create a campaign', 'Upload contacts, set your AI script, and launch.')}
      </td></tr>
    </table>
    ${btn('https://outboundcaller.ai/dashboard', 'Go to Dashboard')}
  `);

  return sendEmail(email, 'Welcome to OutReach AI!', html);
}

// ── 2. Setup Fee Paid ──
export async function sendSetupFeePaidEmail(email, name) {
  const html = wrap(`
    ${icon('✅', '#ecfdf5')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Setup Fee Confirmed!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your $500 setup fee has been processed successfully.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="font-size:14px;color:#065f46;font-weight:600;margin:0;">Payment of $500.00 received</p>
      </td></tr>
    </table>
    <p style="font-size:14px;color:#374151;text-align:center;margin:0 0 24px;line-height:1.6;">
      You can now choose your subscription plan. Head to Billing to pick Starter, Professional, or Enterprise.
    </p>
    ${btn('https://outboundcaller.ai/billing', 'Choose Your Plan')}
  `);

  return sendEmail(email, 'Setup Fee Confirmed - OutReach AI', html);
}

// ── 3. Subscription Activated ──
export async function sendSubscriptionActiveEmail(email, name, planName, planPrice) {
  const html = wrap(`
    ${icon('🚀', '#eef2ff')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">You're Subscribed!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your <strong>${planName}</strong> plan is now active.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#1e1b4b;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:28px;text-align:center;">
        <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Your Plan</p>
        <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0 0 4px;">${planName}</p>
        <p style="font-size:16px;color:#a5b4fc;margin:0;">${planPrice}/month</p>
      </td></tr>
    </table>
    <p style="font-size:14px;color:#374151;text-align:center;margin:0 0 24px;line-height:1.6;">
      You now have full access. Add funds to your calling balance, buy a phone number, and create your first campaign.
    </p>
    ${btn('https://outboundcaller.ai/dashboard', 'Go to Dashboard')}
  `);

  return sendEmail(email, `${planName} Plan Activated - OutReach AI`, html);
}

// ── 4. Appointment Booked ──
export async function sendAppointmentBookedEmail(email, name, contactName, appointmentTime, campaignName) {
  const html = wrap(`
    ${icon('📅', '#ecfdf5')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">New Appointment Booked!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your AI just booked an appointment for you.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid #dcfce7;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Contact</p>
              <p style="font-size:18px;font-weight:700;color:#111827;margin:0;">${contactName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #dcfce7;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Appointment Time</p>
              <p style="font-size:18px;font-weight:700;color:#059669;margin:0;">${appointmentTime}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Campaign</p>
              <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">${campaignName || 'N/A'}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${btn('https://outboundcaller.ai/appointments', 'View Appointments', '#059669')}
  `);

  return sendEmail(email, `New Appointment: ${contactName} - OutReach AI`, html);
}

// ── 5. Low Balance Alert ──
export async function sendLowBalanceEmail(email, name, balance) {
  const html = wrap(`
    ${icon('⚠️', '#fef2f2')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Low Balance Alert</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your calling balance is running low.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:24px;text-align:center;">
        <p style="font-size:12px;color:#991b1b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Current Balance</p>
        <p style="font-size:40px;font-weight:800;color:#dc2626;margin:0;line-height:1;">$${balance.toFixed(2)}</p>
        <p style="font-size:13px;color:#991b1b;margin:12px 0 0;">${balance < 1 ? 'Your balance is empty! Add funds to continue making calls.' : 'Add funds soon to avoid interruptions to your campaigns.'}</p>
      </td></tr>
    </table>
    ${btn('https://outboundcaller.ai/dashboard', 'Add Funds Now', '#dc2626')}
  `);

  return sendEmail(email, 'Low Balance Alert - OutReach AI', html);
}

// ── 6. Funds Added ──
export async function sendFundsAddedEmail(email, name, amount, newBalance) {
  const html = wrap(`
    ${icon('💰', '#ecfdf5')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">Funds Added!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      Hey ${name}, your calling credits have been topped up.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="50%" style="text-align:center;padding:8px;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 6px;">Added</p>
              <p style="font-size:26px;font-weight:800;color:#059669;margin:0;">+$${amount}</p>
            </td>
            <td width="50%" style="text-align:center;padding:8px;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 6px;">New Balance</p>
              <p style="font-size:26px;font-weight:800;color:#111827;margin:0;">$${newBalance.toFixed(2)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${btn('https://outboundcaller.ai/dashboard', 'Go to Dashboard')}
  `);

  return sendEmail(email, `$${amount} Added to Your Balance - OutReach AI`, html);
}

// ── 7. Admin Payment Notification ──
export async function sendAdminPaymentNotification(userName, userEmail, type, amount) {
  const typeLabels = {
    setup_fee: 'Setup Fee',
    subscription: 'New Subscription',
    add_funds: 'Added Funds',
    auto_fund: 'Auto-Fund'
  };
  const label = typeLabels[type] || type;

  const html = wrap(`
    ${icon('💵', '#ecfdf5')}
    <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 8px;">New Payment Received!</h1>
    <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.6;">
      A user just made a payment on the platform.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid #dcfce7;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">User</p>
              <p style="font-size:16px;font-weight:700;color:#111827;margin:0;">${userName}</p>
              <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">${userEmail}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #dcfce7;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Payment Type</p>
              <p style="font-size:16px;font-weight:700;color:#4f46e5;margin:0;">${label}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Amount</p>
              <p style="font-size:32px;font-weight:800;color:#059669;margin:0;">$${typeof amount === 'number' ? amount.toFixed(2) : amount}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${btn('https://outboundcaller.ai/admin/users', 'View Users')}
  `);

  return sendEmail(ADMIN_EMAIL, `Payment: $${typeof amount === 'number' ? amount.toFixed(2) : amount} from ${userName} (${label})`, html);
}
