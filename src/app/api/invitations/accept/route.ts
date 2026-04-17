import { z } from 'zod';
import { NextResponse } from 'next/server';
import { verifyToken, findInvitationByToken, createWorkspaceMember, updateInvitationStatus } from 'your-database-utils';

// Define Zod schema for the request body
const postSchema = z.object({
  token: z.string().nonempty(),
});

// Define the POST endpoint
export async function POST(request: Request) {
  const body = await request.json();

  // Validate request body with Zod
  const validation = postSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  const { token } = validation.data;

  try {
    // Verify the token and extract user information
    const userPayload = verifyToken(token);
    
    // Find the invitation associated with the token
    const invitation = await findInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }
    
    // Check if the invitation is expired and email matches
    if (invitation.expiration < new Date() || invitation.email !== userPayload.email) {
      return NextResponse.json({ error: 'Expired invitation or email mismatch' }, { status: 403 });
    }

    // Create WorkspaceMember entry
    await createWorkspaceMember(invitation.workspaceId, userPayload.userId);

    // Update the invitation status to ACCEPTED
    await updateInvitationStatus(invitation.id, 'ACCEPTED');

    // Return success response
    return NextResponse.json({ message: 'Invitation accepted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}