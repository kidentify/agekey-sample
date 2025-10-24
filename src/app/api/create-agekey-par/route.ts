import { NextRequest, NextResponse } from 'next/server';
import { uuidv7 } from 'uuidv7';

// Simple PAR proxy to AgeKey "create" issuer.
// We keep this server-side to avoid exposing the client secret.
export async function POST(req: NextRequest) {
  try {
    const { state } = await req.json();
    if (!state) {
      return NextResponse.json({ error: 'Missing state' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_AGEKEY_CLIENT_ID;
    const clientSecret = process.env.AGEKEY_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_AGEKEY_REDIRECT_URI;
    const issuer = process.env.NEXT_PUBLIC_AGEKEY_CREATE_ISSUER || 'https://api.agekey.org/v1/oidc/create';

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: 'Server is missing env configuration' }, { status: 500 });
    }

    // Build PAR request payload
    // Example authorization_details for demo purposes only; replace with your verification payload
    const authorizationDetails = [
      {
        method: 'id_doc_scan',
        age: { date_of_birth: '2000-01-02' },
        verified_at: new Date().toISOString(),
        verification_id: uuidv7()
      }
    ];

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid',
      response_type: 'none',
      redirect_uri: redirectUri,
      state,
      authorization_details: JSON.stringify(authorizationDetails)
    });

    // Simple PAR endpoint: append /par to the create issuer URL
    const parEndpoint = `${issuer.replace(/\/+$/, '')}/par`;

    const res = await fetch(parEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'PAR request failed', details: text }, { status: 502 });
    }

    const json = await res.json();
    // Expecting { request_uri: string, expires_in: number }
    return NextResponse.json({ request_uri: json.request_uri });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}


