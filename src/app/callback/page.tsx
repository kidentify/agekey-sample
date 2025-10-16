'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { UserManager } from 'oidc-client';
// This callback page handles both flows:
// - Use AgeKey: validates the implicit response and reads threshold results from the id_token
// - Create AgeKey: interprets query params to show completion/cancel state

interface AgeThresholds {
  [key: string]: boolean;
}

function CallbackContent() {
  const router = useRouter();
  const [result, setResult] = useState<{
    success: boolean;
    flow: string;
    message: string;
    ageThresholds?: AgeThresholds;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('🔄 Processing callback with oidc-client...');
        
        // 1) Standard OIDC error check
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
          console.error('❌ Error in callback:', error);
          setResult({
            success: false,
            flow: 'unknown',
            message: `AgeKey flow failed: ${error}`
          });
          setLoading(false);
          return;
        }

        // 2) Distinguish flows by presence of id_token
        const idToken = urlParams.get('id_token');
        
        if (idToken) {
          // Use AgeKey flow: implicit-like response containing id_token
          console.log('🔄 Processing Use AgeKey flow (implicit flow with id_token)...');
          
          const userManager = new UserManager({
            authority: process.env.NEXT_PUBLIC_AGEKEY_USE_ISSUER || 'https://api.agekey.org/v1/oidc/use',
            client_id: process.env.NEXT_PUBLIC_AGEKEY_CLIENT_ID || 'your_client_id_here',
            redirect_uri: process.env.NEXT_PUBLIC_AGEKEY_REDIRECT_URI || 'http://localhost:3000/callback',
            response_type: 'id_token',
            response_mode: 'query',
            scope: 'openid',
            loadUserInfo: false,
            automaticSilentRenew: false,
            includeIdTokenInSilentRenew: false
          });

          try {
            // Let oidc-client validate state/nonce and validate and parse the id_token
            const user = await userManager.signinRedirectCallback();
            console.log('✅ Use AgeKey flow completed successfully');
            console.log('🎯 User object:', user);
            console.log('🎯 Age threshold results:', user.profile?.age_thresholds);
            
            setResult({
              success: true,
              flow: 'use',
              message: 'Age verification completed successfully!',
              ageThresholds: user.profile?.age_thresholds
            });
          } catch (callbackError) {
            console.error('❌ Error processing Use AgeKey callback:', callbackError);
            setResult({
              success: false,
              flow: 'use',
              message: `Authentication failed: ${callbackError instanceof Error ? callbackError.message : 'Unknown error'}`
            });
          }
        } else {
          // Create AgeKey flow: no id_token expected
          console.log('🔄 Processing Create AgeKey flow...');
          
          try {
            // AgeKey sends a helper flag to indicate if the agekey was successfully created
            const agekeyCreated = urlParams.get('agekey_created');
            const url = window.location.href;
            console.log('🎯 Create AgeKey callback URL:', url);
            console.log('🎯 agekey_created parameter:', agekeyCreated);
            
            if (agekeyCreated === 'true') {
              // AgeKey was successfully created
              console.log('✅ AgeKey created successfully');
              setResult({
                success: true,
                flow: 'create',
                message: 'AgeKey created successfully!'
              });
            } else if (agekeyCreated === 'false') {
              // User canceled or AgeKey creation failed
              console.log('ℹ️ AgeKey creation was not completed (user may have canceled)');
              setResult({
                success: false,
                flow: 'create',
                message: 'AgeKey creation was not completed. This may happen if you canceled the process or if there was an issue during age verification.'
              });
            } else {
              // No agekey_created parameter - assume success for backward compatibility
              console.log('✅ Create AgeKey flow completed (no agekey_created parameter)');
              setResult({
                success: true,
                flow: 'create',
                message: 'AgeKey creation process completed!'
              });
            }
          } catch (callbackError) {
            console.error('❌ Error processing Create AgeKey callback:', callbackError);
            setResult({
              success: false,
              flow: 'create',
              message: `Failed to process Create AgeKey callback: ${callbackError instanceof Error ? callbackError.message : 'Unknown error'}`
            });
          }
        }
      } catch (error) {
        console.error('❌ Error processing callback:', error);
        setResult({
          success: false,
          flow: 'unknown',
          message: `Failed to process callback: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, []);

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing AgeKey response...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          {result?.success ? (
            <div className="text-green-500 text-6xl mb-4">✅</div>
          ) : result?.flow === 'create' && result?.message?.includes('not completed') ? (
            <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
          ) : (
            <div className="text-red-500 text-6xl mb-4">❌</div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {result?.success ? 'Success!' : 
             result?.flow === 'create' && result?.message?.includes('not completed') ? 'Not Completed' : 
             'Error'}
          </h1>
          <p className="text-gray-600">{result?.message}</p>
        </div>

        {result?.success && result.flow === 'use' && result.ageThresholds && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Age Verification Results:</h3>
            <div className="space-y-2">
              {Object.entries(result.ageThresholds).map(([threshold, verified]) => (
                <div key={threshold} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Age {threshold}+</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleBackToHome}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Back to Demo
        </button>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
