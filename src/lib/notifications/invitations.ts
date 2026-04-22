interface InvitationEmailPayload {
  to: string
  role: string
  token: string
  inviterName?: string | null
  workspaceName: string
  boardName?: string | null
}

function getInvitationUrl(token: string) {
  const baseUrl = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim()
  if (!baseUrl) {
    throw new Error('APP_URL (ou NEXTAUTH_URL) nao configurada para gerar link de convite.')
  }

  return `${baseUrl.replace(/\/$/, '')}/invite/${encodeURIComponent(token)}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY e EMAIL_FROM precisam estar configuradas para envio de convites.')
  }

  return { apiKey, from }
}

export async function sendInvitationEmail(payload: InvitationEmailPayload) {
  const { apiKey, from } = getResendConfig()
  const invitationUrl = getInvitationUrl(payload.token)
  const inviter = payload.inviterName?.trim() || 'Um membro da equipe'
  const scope = payload.boardName ? `board "${payload.boardName}"` : `workspace "${payload.workspaceName}"`
  const subject = `${inviter} convidou voce para o ${scope}`
  const text = [
    `${inviter} convidou voce para o ${scope} com papel ${payload.role}.`,
    `Abra este link para continuar: ${invitationUrl}`,
  ].join('\n')
  const escapedInviter = escapeHtml(inviter)
  const escapedScope = escapeHtml(scope)
  const escapedRole = escapeHtml(payload.role)
  const escapedInvitationUrl = escapeHtml(invitationUrl)
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>Ola!</p>
      <p><strong>${escapedInviter}</strong> convidou voce para o ${escapedScope} com papel <strong>${escapedRole}</strong>.</p>
      <p>
        <a href="${escapedInvitationUrl}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
          Aceitar convite
        </a>
      </p>
      <p>Se o botao nao funcionar, use este link:</p>
      <p><a href="${escapedInvitationUrl}">${escapedInvitationUrl}</a></p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Falha ao enviar e-mail de convite (${response.status}). ${details}`)
  }
}
