import { createClient } from '@supabase/supabase-js';

/**
 * Notification dispatch — sends platform notifications and optionally WhatsApp messages.
 * WhatsApp degrades gracefully: if no WA config, only platform notification is created.
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface DispatchOptions {
  tenantId: string;
  notificationType: string;
  title: string;
  body?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
}

/**
 * Create an in-platform notification for agents.
 */
export async function createNotification(opts: DispatchOptions) {
  const supabase = getServiceClient();

  const { error } = await supabase.from('notifications').insert({
    tenant_id: opts.tenantId,
    notification_type: opts.notificationType,
    title: opts.title,
    body: opts.body || null,
    linked_entity_type: opts.linkedEntityType || null,
    linked_entity_id: opts.linkedEntityId || null,
    status: 'unread',
  });

  if (error) {
    console.error('[notification] Failed to create:', error.message);
  }
}

interface WhatsAppMessageOptions {
  tenantId: string;
  recipientPhone: string;
  templateType: string;
  variables: Record<string, string>;
}

/**
 * Send a WhatsApp message using the tenant's configured WA credentials.
 * Degrades gracefully — returns false if WA is not configured.
 */
export async function sendWhatsApp(opts: WhatsAppMessageOptions): Promise<boolean> {
  const supabase = getServiceClient();

  // Fetch tenant WA settings
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('wa_api_key, wa_phone_number_id, wa_business_account_id')
    .eq('tenant_id', opts.tenantId)
    .single();

  if (!settings?.wa_api_key || !settings?.wa_phone_number_id) {
    // No WA configured — graceful degradation
    return false;
  }

  // Fetch the notification template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('template_body')
    .eq('tenant_id', opts.tenantId)
    .eq('type', opts.templateType)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .single();

  if (!template) {
    return false;
  }

  // Replace template variables
  let messageBody = template.template_body;
  for (const [key, value] of Object.entries(opts.variables)) {
    messageBody = messageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Send via WhatsApp Cloud API
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${settings.wa_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.wa_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: opts.recipientPhone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: messageBody },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('[whatsapp] Send failed:', err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Network error:', err);
    return false;
  }
}

/**
 * Helper: Notify on new booking request (worker pending).
 */
export async function notifyBookingRequest(
  tenantId: string,
  bookingId: string,
  workerPseudonym: string,
  clientDisplayName: string,
  slotDate: string,
  slotStart: string
) {
  await createNotification({
    tenantId,
    notificationType: 'booking_no_show', // reuse type for now
    title: `New booking request for ${workerPseudonym}`,
    body: `${clientDisplayName} requested ${slotDate} at ${slotStart.slice(0, 5)}`,
    linkedEntityType: 'booking',
    linkedEntityId: bookingId,
  });
}

/**
 * Helper: Notify client that booking is confirmed (WA if opted in).
 */
export async function notifyBookingConfirmed(
  tenantId: string,
  bookingId: string,
  clientPhone: string | null,
  clientWaOptIn: boolean,
  variables: Record<string, string>
) {
  if (clientPhone && clientWaOptIn) {
    await sendWhatsApp({
      tenantId,
      recipientPhone: clientPhone,
      templateType: 'booking_confirmed',
      variables,
    });
  }
}

/**
 * Helper: Notify on client signup (agent notification).
 */
export async function notifyClientSignup(
  tenantId: string,
  clientId: string,
  displayName: string
) {
  await createNotification({
    tenantId,
    notificationType: 'client_signup',
    title: `New client registration: ${displayName}`,
    body: 'Review and approve or reject this client.',
    linkedEntityType: 'client',
    linkedEntityId: clientId,
  });
}

/**
 * Helper: Notify client that their account was approved (WA if opted in).
 */
export async function notifyClientApproved(
  tenantId: string,
  clientPhone: string | null,
  clientWaOptIn: boolean,
  displayName: string
) {
  if (clientPhone && clientWaOptIn) {
    await sendWhatsApp({
      tenantId,
      recipientPhone: clientPhone,
      templateType: 'client_approved',
      variables: { client_name: displayName },
    });
  }
}

/**
 * Helper: Notify when worker goes offline.
 */
export async function notifyWorkerOffline(
  tenantId: string,
  workerId: string,
  pseudonym: string,
  reason: string
) {
  await createNotification({
    tenantId,
    notificationType: 'worker_offline',
    title: `${pseudonym} went offline`,
    body: reason,
    linkedEntityType: 'worker',
    linkedEntityId: workerId,
  });
}

/**
 * Helper: Notify when worker edits their profile.
 */
export async function notifyWorkerProfileEdit(
  tenantId: string,
  workerId: string,
  pseudonym: string,
  changedFields: string[]
) {
  await createNotification({
    tenantId,
    notificationType: 'worker_profile_edit',
    title: `${pseudonym} updated their profile`,
    body: `Changed: ${changedFields.join(', ')}`,
    linkedEntityType: 'worker',
    linkedEntityId: workerId,
  });
}
