# Mirakl Messages - Troubleshooting Guide

## Current Issue: 401 Invalid JWT

### Problem
The Edge Function is returning a 401 error with "Invalid JWT" from the Supabase gateway.

### Root Cause
The Supabase JavaScript client's `functions.invoke()` method automatically includes:
1. The `Authorization: Bearer <access_token>` header from the current session
2. The `apikey` header with the anon key

However, the gateway is rejecting the JWT as invalid.

### Possible Causes

1. **Session Token Mismatch**: The JWT might be from a different Supabase project
2. **Expired Session**: The session might have expired
3. **Missing apikey Header**: The anon key might not be included automatically

### Solution: Manual Fetch with Explicit Headers

Since `supabase.functions.invoke()` isn't working, we need to use a manual fetch approach with explicit headers.

Update `/Users/sh/Documents/Laptekexport/src/utils/miraklApi.ts`:

```typescript
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function invokeMiraklFunction(body: Record<string, any>) {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/mirakl-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Function error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
```

Then use this function instead of `supabase.functions.invoke()`.

### Alternative: Check Project Configuration

1. Verify the Supabase URL and anon key in `.env` match your project
2. Check if JWT secret has been rotated in Supabase dashboard
3. Ensure the Edge Function is deployed to the correct project

### Testing

Test the session and JWT:

```javascript
// In browser console
const { data } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('Access Token:', data.session?.access_token);

// Decode JWT
const token = data.session.access_token;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT Payload:', payload);
console.log('Issuer:', payload.iss);
console.log('Audience:', payload.aud);
```

The issuer should match your Supabase URL.
