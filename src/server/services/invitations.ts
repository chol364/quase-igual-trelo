type InvitationEmailInput = {
  requestUrl: string
  token: string
  recipientEmail: string
  inviterName?: string | null
  workspaceName: string
  boardTitle?: string | null
}

type InvitationDeliveryResult = {
  invitationLink: string
  delivered: boolean
  reason?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getBaseUrl(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin
  return process.env.APP_BASE_URL || requestOrigin
}

export async function deliverInvitationEmail(input: InvitationEmailInput): Promise<InvitationDeliveryResult> {
  const invitationLink = `${getBaseUrl(input.requestUrl)}/invite/${input.token}`
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM

  if (!resendApiKey || !emailFrom) {
    return {
      invitationLink,
      delivered: false,
      reason: 'email_not_configured',
    }
  }

  const scopeLabel = input.boardTitle ? `board ${input.boardTitle}` : `workspace ${input.workspaceName}`
  const subjectScope = input.boardTitle ? `${input.workspaceName} / ${input.boardTitle}` : input.workspaceName
  const escapedInviter = escapeHtml(input.inviterName || 'Um membro')
  const escapedScopeLabel = escapeHtml(scopeLabel)
  const escapedInvitationLink = escapeHtml(invitationLink)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [input.recipientEmail],
      subject: `${input.inviterName || 'Um membro'} te convidou para ${subjectScope}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Voce foi convidado</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            ${escapedInviter} te convidou para participar do <strong>${escapedScopeLabel}</strong>.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${escapedInvitationLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Aceitar convite</a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">Ou copie este link:<br/><a href="${escapedInvitationLink}" style="color: #2563eb;">${escapedInvitationLink}</a></p>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">Este convite expira em 7 dias.</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    return {
      invitationLink,
      delivered: false,
      reason: details || `resend_http_${response.status}`,
    }
  }

  return {
    invitationLink,
    delivered: true,
  }
}
