import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

const InvitePage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();
    const { data: session } = useSession();
    const { token } = router.query;

    useEffect(() => {
        const acceptInvitation = async () => {
            if (!session) {
                // Redirect to login if not authenticated
                router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
                return;
            }

            try {
                const response = await fetch(`/api/invitations/accept?token=${token}`, {
                    method: 'POST',
                });

                if (!response.ok) {
                    throw new Error('Failed to accept invitation');
                }

                const result = await response.json();
                alert(result.message || 'Invitation accepted successfully!');
                router.push('/workspaces');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }; 

        acceptInvitation();
    }, [session, token, router]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    return <div>Processing invitation...</div>;
};

export default InvitePage;
