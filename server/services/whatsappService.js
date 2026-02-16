const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const smsFromNumber = process.env.TWILIO_SMS_FROM;
const smsFallbackEnabled = process.env.TWILIO_SMS_FALLBACK === "true";

const isConfigured = Boolean(accountSid && authToken && fromNumber);
const isSmsConfigured = Boolean(accountSid && authToken && smsFromNumber);
const client = isConfigured ? twilio(accountSid, authToken) : null;

const normalizeRecipient = (phone) => {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (!trimmed) return null;
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
};

const sendWhatsAppMessage = async ({ to, body }) => {
  const recipient = normalizeRecipient(to);
  if (!recipient) return;

  if (!isConfigured) {
    console.log(`[WHATSAPP:SKIPPED] ${recipient} -> ${body}`);
    return;
  }

  await client.messages.create({
    from: fromNumber,
    to: recipient,
    body,
  });
};

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^whatsapp:/, "");
};

const sendSmsMessage = async ({ to, body }) => {
  const recipient = normalizePhoneNumber(to);
  if (!recipient) return;

  if (!isSmsConfigured) {
    console.log(`[SMS:SKIPPED] ${recipient} -> ${body}`);
    return;
  }

  await client.messages.create({
    from: smsFromNumber,
    to: recipient,
    body,
  });
};

const sendMessageWithFallback = async ({ to, body }) => {
  try {
    await sendWhatsAppMessage({ to, body });
    return true;
  } catch (error) {
    console.error(`[WHATSAPP:ERROR] ${error.message}`);
    if (smsFallbackEnabled) {
      try {
        await sendSmsMessage({ to, body });
        return true;
      } catch (smsError) {
        console.error(`[SMS:ERROR] ${smsError.message}`);
      }
    }
    return false;
  }
};

const sendApprovalMessage = async ({ to, booking, roomName }) => {
  const body =
    `\u2714 Booking Approved\n` +
    `Room: ${roomName}\n` +
    `Date: ${new Date(booking.date).toDateString()}\n` +
    `Time: ${booking.startTime} - ${booking.endTime}`;

  await sendMessageWithFallback({ to, body });
};

const sendCancellationMessage = async ({ to, booking, reason }) => {
  const body =
    `\u274C Booking Cancelled\n` +
    `Date: ${new Date(booking.date).toDateString()}\n` +
    `Time: ${booking.startTime} - ${booking.endTime}\n` +
    `Reason: ${reason || "Cancelled by system"}`;

  await sendMessageWithFallback({ to, body });
};

const sendOverrideMessage = async ({ to, booking, overridingPriority }) => {
  const body =
    `\u26A0 Booking Overridden\n` +
    `Date: ${new Date(booking.date).toDateString()}\n` +
    `Time: ${booking.startTime} - ${booking.endTime}\n` +
    `Override Priority: ${overridingPriority}`;

  await sendMessageWithFallback({ to, body });
};

module.exports = {
  sendWhatsAppMessage,
  sendSmsMessage,
  sendMessageWithFallback,
  sendApprovalMessage,
  sendCancellationMessage,
  sendOverrideMessage,
};
