# Deploying the Mirakl Messages Edge Function

## Overview

The Mirakl Messages feature requires a Supabase Edge Function to be deployed. This function acts as a secure proxy between your frontend and the Mirakl API, solving CORS issues and keeping your API credentials secure.

## Prerequisites

- Supabase account with an active project
- Supabase CLI (or use npx)
- Your Mirakl API credentials

## Deployment Steps

### Step 1: Login to Supabase CLI

```bash
npx supabase login
```

This will open a browser window for you to authenticate.

### Step 2: Link Your Project

```bash
npx supabase link --project-ref xqsatwytjzvlhdmckfsb
```

### Step 3: Set Environment Variables

You need to set the Mirakl API credentials as secrets in Supabase:

```bash
npx supabase secrets set MIRAKL_API_URL=https://marketplace.bestbuy.ca
npx supabase secrets set MIRAKL_API_KEY=8b96ad86-ecbc-4e40-ae38-626353dc82f5
```

### Step 4: Deploy the Edge Function

```bash
npx supabase functions deploy mirakl-messages
```

### Step 5: Verify Deployment

After deployment, you should see output like:

```
Deployed Function mirakl-messages in region us-east-1
Function URL: https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/mirakl-messages
```

## Testing the Function

You can test the function using curl:

```bash
curl -i --location --request POST 'https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/mirakl-messages' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"action":"list","params":{"max":"10"}}'
```

Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anon key from the `.env` file.

## Alternative: Deploy via Supabase Dashboard

If you prefer using the web interface:

1. Go to https://supabase.com/dashboard/project/xqsatwytjzvlhdmckfsb
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it `mirakl-messages`
5. Copy the contents of `supabase/functions/mirakl-messages/index.ts` into the editor
6. Click **Deploy**
7. Go to **Settings** → **Edge Functions** → **Secrets**
8. Add the following secrets:
   - `MIRAKL_API_URL`: `https://marketplace.bestbuy.ca`
   - `MIRAKL_API_KEY`: `8b96ad86-ecbc-4e40-ae38-626353dc82f5`

## Troubleshooting

### Error: "Access token not provided"

Run `npx supabase login` to authenticate.

### Error: "Project not linked"

Run `npx supabase link --project-ref xqsatwytjzvlhdmckfsb`

### Function deployed but not working

1. Check that secrets are set correctly:
   ```bash
   npx supabase secrets list
   ```

2. Check function logs:
   ```bash
   npx supabase functions logs mirakl-messages
   ```

3. Verify the function URL is correct in your browser's network tab

## After Deployment

Once deployed, the Messages page in your application will automatically use the Edge Function. Just:

1. Refresh your browser
2. Navigate to the Messages tab
3. The messages should now load without CORS errors!

## Security Notes

- ✅ API keys are stored securely as Supabase secrets (not in frontend code)
- ✅ All requests are authenticated (only logged-in users can access)
- ✅ CORS is properly configured
- ✅ The Edge Function validates user authentication before making Mirakl API calls

## Next Steps

After successful deployment:
1. Test the Messages page
2. Verify messages load correctly
3. Test marking messages as read
4. Test sending replies

If you encounter any issues, check the Supabase function logs for detailed error messages.
