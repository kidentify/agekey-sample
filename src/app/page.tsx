'use client';

import { useState, useEffect } from 'react';
import { UserManager } from 'oidc-client';
// This page drives two OIDC flows:
// 1) "Use AgeKey" (implicit-like) -> requests an id_token embedding age threshold results
// 2) "Create AgeKey" -> starts AgeKey issuance using PAR, then redirects the user

export default function Home() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [userManager, setUserManager] = useState<{
    use: UserManager;
    create: UserManager;
  } | null>(null);

  useEffect(() => {
    // Simple check: if client ID is configured, assume everything is configured
    const clientId = process.env.NEXT_PUBLIC_AGEKEY_CLIENT_ID;
    const configured = clientId && clientId !== 'your_client_id_here' && clientId.trim() !== '';
    setIsConfigured(!!configured);

    // Initialize two UserManager instances, one for each issuer.
    // We read configuration from public env vars so this can run fully client-side.
    const useAgeKeyManager = new UserManager({
      authority: process.env.NEXT_PUBLIC_AGEKEY_USE_ISSUER || 'https://api.agekey.org/v1/oidc/use',
      client_id: process.env.NEXT_PUBLIC_AGEKEY_CLIENT_ID || 'your_client_id_here',
      redirect_uri: process.env.NEXT_PUBLIC_AGEKEY_REDIRECT_URI || 'http://localhost:3000/callback',
      response_type: 'id_token',
      response_mode: 'query',
      scope: 'openid',
      automaticSilentRenew: false,
      includeIdTokenInSilentRenew: false
    });

    const createAgeKeyManager = new UserManager({
      authority: process.env.NEXT_PUBLIC_AGEKEY_CREATE_ISSUER || 'https://api.agekey.org/v1/oidc/create',
      client_id: process.env.NEXT_PUBLIC_AGEKEY_CLIENT_ID || 'your_client_id_here',
      redirect_uri: process.env.NEXT_PUBLIC_AGEKEY_REDIRECT_URI || 'http://localhost:3000/callback',
      // No token is expected back during creation; we only receive status on callback
      response_type: 'none',
      response_mode: 'query',
      scope: 'openid',
      automaticSilentRenew: false,
      includeIdTokenInSilentRenew: false
    });

    setUserManager({ use: useAgeKeyManager, create: createAgeKeyManager });
  }, []);

  const handleUseAgeKey = async () => {
    if (!userManager || !isConfigured) return;
    
    setIsLoading('use');
    try {
      // Ask the provider to evaluate these age thresholds and return booleans in the id_token
      const claims = {
        age_thresholds: [13, 18]
      };
      
      // Build the authorization request and redirect the browser
      await userManager.use.signinRedirect({
        state: { flow: 'use' },
        extraQueryParams: {
          claims: JSON.stringify(claims)
        }
      });
    } catch (error) {
      console.error('Error starting Use AgeKey flow:', error);
      setIsLoading(null);
    }
  };

  const handleCreateAgeKey = async () => {
    if (!userManager || !isConfigured) return;
    
    setIsLoading('create');
    try {
      // First create a signin request so oidc-client generates and stores a matching state
      const signinRequest = await userManager.create.createSigninRequest({
        state: { flow: 'create' }
      });
      
      // Extract that state from the request URL so we can reuse it in the PAR request
      const url = new URL(signinRequest.url);
      const state = url.searchParams.get('state');
      
      if (!state) {
        throw new Error('No state found in signin request');
      }
      
      // Submit a Pushed Authorization Request to the server route, which forwards to AgeKey
      const response = await fetch('/api/create-agekey-par', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit PAR request');
      }
      
      const { request_uri } = await response.json();
      
      // Finally redirect to authorization with the returned request_uri reference
      await userManager.create.signinRedirect({
        state: { flow: 'create' },
        extraQueryParams: {
          request_uri: request_uri
        }
      });
    } catch (error) {
      console.error('Error starting Create AgeKey flow:', error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔐 AgeKey Demo</h1>
          <p className="text-gray-600 text-lg">OpenID Connect Age Verification</p>
        </div>

        {/* Configuration Status */}
        {!isConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <div className="text-yellow-600 text-2xl mr-2">⚠️</div>
              <h3 className="text-lg font-semibold text-yellow-800">Configuration Required</h3>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Please configure your AgeKey client ID before using the demo.
            </p>
            <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <p><strong>Quick Setup:</strong></p>
              <p>1. Copy <code className="bg-yellow-200 px-1 rounded">.env.example</code> to <code className="bg-yellow-200 px-1 rounded">.env.local</code></p>
              <p>2. Fill in your actual AgeKey credentials</p>
              <p>3. Restart the development server</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4 mb-8">
          <button
            onClick={handleUseAgeKey}
            disabled={isLoading !== null || !isConfigured}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading === 'use' ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : !isConfigured ? (
              'Use AgeKey (Configure Required)'
            ) : (
              'Use AgeKey'
            )}
          </button>
          
          <button
            onClick={handleCreateAgeKey}
            disabled={isLoading !== null || !isConfigured}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading === 'create' ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : !isConfigured ? (
              'Create AgeKey (Configure Required)'
            ) : (
              'Create AgeKey'
            )}
          </button>
        </div>
        
        <div className="text-sm text-gray-500 space-y-2">
          <p>This demo demonstrates the AgeKey OpenID Connect integration using oidc-client.</p>
          {!isConfigured && (
            <p className="text-yellow-600 font-medium">⚠️ Configure your credentials in .env.local before testing.</p>
          )}
        </div>
      </div>
    </div>
  );
}