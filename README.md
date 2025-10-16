# AgeKey Sample

A Next.js demonstration of AgeKey integration using the `oidc-client` package. This demo showcases both the **Use AgeKey** and **Create AgeKey** flows as described in the [AgeKey Documentation](https://docs.agekey.org).

## Features

- 🔐 **Use AgeKey Flow**: Verify age using an existing AgeKey
- ➕ **Create AgeKey Flow**: Create a new AgeKey after age verification
- 🎨 **Simple UI**: Responsive interface with Tailwind CSS
- 🔧 **Easy Configuration**: Simple config file for credentials

## Prerequisites

- Node.js 18+
- AgeKey client credentials
- Registered Redirect URI

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AgeKey Credentials

#### Manual Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual AgeKey credentials:

```bash
# AgeKey Configuration
# Note: Variables with NEXT_PUBLIC_ prefix are exposed to the browser
NEXT_PUBLIC_AGEKEY_CLIENT_ID=your_actual_client_id_here
AGEKEY_CLIENT_SECRET=your_actual_client_secret_here
NEXT_PUBLIC_AGEKEY_USE_ISSUER=https://api.agekey.org/v1/oidc/use
NEXT_PUBLIC_AGEKEY_CREATE_ISSUER=https://api.agekey.org/v1/oidc/create
NEXT_PUBLIC_AGEKEY_REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Open the Demo

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Use AgeKey Flow

1. User clicks "Use AgeKey" button
2. Frontend creates `UserManager` instance with `oidc-client`
3. Frontend calls `signinRedirect()` with age threshold claims
4. Browser redirects to AgeKey service
5. User authenticates with their AgeKey
6. AgeKey service redirects back to `/callback` with an `id_token`
7. Callback page uses `oidc-client` to process the response and display results

### Create AgeKey Flow

1. User clicks "Create AgeKey" button
2. Frontend calls `/api/create-agekey-par` to submit age verification data via PAR
3. Server returns `request_uri` from AgeKey service
4. Frontend creates `UserManager` instance and calls `signinRedirect()` with `request_uri`
5. Browser redirects to AgeKey service
6. User creates their AgeKey
7. AgeKey service redirects back to `/callback`
8. Callback page uses `oidc-client` to process the response and confirm success

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── create-agekey-par/route.ts  # PAR submission for Create AgeKey
│   ├── callback/page.tsx               # Callback handler page
│   ├── page.tsx                        # Main demo page
│   └── layout.tsx                      # App layout
├── .env.example                        # Environment variables template
├── .env.local                          # Environment variables (create this)
└── ...
```

## Configuration Details

### Required Credentials

**Public Variables (exposed to browser):**
- `NEXT_PUBLIC_AGEKEY_CLIENT_ID` - Your AgeKey client ID
- `NEXT_PUBLIC_AGEKEY_USE_ISSUER` - Use AgeKey issuer URL (e.g., `https://api.agekey.org/v1/oidc/use`)
- `NEXT_PUBLIC_AGEKEY_CREATE_ISSUER` - Create AgeKey issuer URL (e.g., `https://api.agekey.org/v1/oidc/create`)
- `NEXT_PUBLIC_AGEKEY_REDIRECT_URI` - Redirect URI (e.g., `http://localhost:3000/callback`)

**Private Variables (server-only):**
- `AGEKEY_CLIENT_SECRET` - Your AgeKey client secret (never expose this to the browser)

**Optional Variables:**
- `PORT` - Server port (default: 3000)

### Age Thresholds

The demo checks for ages 13+ and 18+ by default. You can modify this in `src/app/page.tsx`:

```typescript
const claims = {
  age_thresholds: [13, 18]  // Add or modify age thresholds here
};
```

### Age Verification Data

For the Create AgeKey flow, the demo uses example age verification data. In a real application, you would:

1. Integrate with an age verification vendor
2. Collect the verification result
3. Submit it via the PAR endpoint

Example verification data structure:

```typescript
const ageVerification = {
  type: 'age_verification',
  method: 'id_doc_scan',  // or 'bank_account', 'credit_card', etc.
  age: {
    date_of_birth: '2000-01-02'  // or 'years': 24, or 'at_least_years': 18
  },
  verified_at: new Date().toISOString(),
  verification_id: 'unique_verification_id',
  attributes: {
    face_match_performed: true  // method-specific attributes
  }
};
```

## API Routes

- `POST /api/create-agekey-par` - Submit PAR request for Create AgeKey flow
- `GET /callback` - Handle AgeKey service callbacks

## Security Considerations

⚠️ **Important**: This is a demo application. For production use:

1. **Secure credential storage** - Use environment variables or secure key management
2. **HTTPS only** - Use HTTPS in production
3. **Error handling** - Add comprehensive error handling and logging

## Troubleshooting

### Common Issues

1. **"Using default configuration" warning**
   - Make sure you created `.env.local` with your actual AgeKey credentials
   - Copy from `.env.example` and fill in your values

2. **"Invalid redirect_uri"**
   - Ensure your redirect URI is registered
   - Check that the URI in your `.env.local` file matches exactly

3. **"Invalid client_id"**
   - Verify your client ID is correct
   - Make sure you're using the right environment (sandbox vs production)

4. **PAR request fails**
   - Check your client secret
   - Verify the age verification data format
   - Ensure the Create AgeKey issuer URL is correct

### Debug Mode

Enable detailed logging by setting the environment variable:

```bash
DEBUG=oidc-client:* npm run dev
```

## Dependencies

- **next**: React framework with App Router
- **react**: UI library
- **oidc-client**: OpenID Connect client library
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety

## License

MIT

## Support

For AgeKey-specific questions, consult the  [AgeKey Documentation](https://docs.agekey.org).

For technical issues with this demo, check the browser console and server logs for detailed error messages.