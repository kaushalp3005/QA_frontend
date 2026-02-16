# OpenAI API Key Setup for Netlify Deployment

## Error: "Your authentication token is not from a valid issuer"

This error occurs when the OpenAI API key is not properly configured in Netlify.

## Steps to Fix:

### 1. Get Your OpenAI API Key
- Go to https://platform.openai.com/api-keys
- Create a new API key or copy an existing one
- The key should start with `sk-` (e.g., `sk-proj-...`)

### 2. Set Environment Variable in Netlify

#### Option A: Via Netlify Dashboard
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-`)
5. Click **Save**
6. **Important:** Redeploy your site after adding the variable

#### Option B: Via Netlify CLI
```bash
netlify env:set OPENAI_API_KEY "sk-your-actual-api-key-here"
```

### 3. Redeploy Your Site
After setting the environment variable, you **must redeploy**:
- Go to **Deploys** tab
- Click **Trigger deploy** → **Deploy site**
- Or push a new commit to trigger automatic deployment

### 4. Verify the Setup
After redeployment, check the Netlify function logs:
- Go to **Functions** tab
- Look for logs showing: `Using OpenAI API key: sk-proj-...`
- If you see errors, check that the API key is correct

## Common Issues:

### Issue 1: API Key Not Set
**Symptom:** Error message about API key not configured
**Solution:** Make sure `OPENAI_API_KEY` is set in Netlify environment variables

### Issue 2: Invalid API Key Format
**Symptom:** "Your authentication token is not from a valid issuer"
**Solution:** 
- Ensure the key starts with `sk-`
- Remove any extra spaces or quotes
- Make sure you copied the entire key

### Issue 3: API Key from Wrong Account
**Symptom:** "Your authentication token is not from a valid issuer"
**Solution:** 
- Verify you're using the correct API key from your OpenAI account
- Check if the API key has been revoked or expired

### Issue 4: Environment Variable Not Loaded
**Symptom:** Works locally but not on Netlify
**Solution:**
- Make sure you redeployed after setting the variable
- Check that the variable name is exactly `OPENAI_API_KEY` (case-sensitive)
- Verify in Netlify dashboard that the variable is set

## Testing:

After setup, test the AI summary feature in the RCA creation form. If it still fails:
1. Check Netlify function logs for detailed error messages
2. Verify the API key is active in your OpenAI account
3. Ensure you have credits/quota available in your OpenAI account

## Troubleshooting "Your authentication token is not from a valid issuer"

If you're still getting this error after setting the environment variable:

### Step 1: Check Netlify Function Logs
1. Go to Netlify Dashboard → **Functions** tab
2. Click on the function that handles `/api/openai/generate-root-cause`
3. Look for logs starting with `=== OpenAI API Route Debug ===`
4. Check what environment variables are detected

### Step 2: Verify Environment Variable
1. Go to **Site settings** → **Environment variables**
2. Make sure `OPENAI_API_KEY` is exactly spelled (case-sensitive)
3. Check that the value doesn't have quotes around it
4. Make sure there are no extra spaces before/after the key

### Step 3: Check API Key Format
The API key should:
- Start with `sk-` (e.g., `sk-proj-...` or `sk-...`)
- Be the full key from OpenAI dashboard
- Not have any extra characters or spaces

### Step 4: Force Redeploy
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. This ensures the environment variable is loaded fresh

### Step 5: Verify API Key in OpenAI
1. Go to https://platform.openai.com/api-keys
2. Check if the key is still active
3. Check if it has been revoked or expired
4. Verify you have credits/quota available

### Step 6: Test API Key Directly
You can test if the API key works by running this in a terminal:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

If this fails, the API key itself is invalid.

### Step 7: Check for Multiple Environment Variables
Sometimes Netlify might have multiple environment variables with similar names. Check for:
- `OPENAI_API_KEY` (correct)
- `OPENAI_KEY` (might be set incorrectly)
- `NEXT_PUBLIC_OPENAI_API_KEY` (not recommended for server-side)

### Step 8: Check Netlify Build Logs
1. Go to **Deploys** → Latest deploy → **Deploy log**
2. Look for any errors related to environment variables
3. Check if the build completed successfully

## Common Error Messages:

### "OpenAI API key is not configured"
- **Cause:** Environment variable not set or not accessible
- **Fix:** Set `OPENAI_API_KEY` in Netlify and redeploy

### "Invalid OpenAI API key format"
- **Cause:** API key doesn't start with `sk-`
- **Fix:** Verify you copied the complete key from OpenAI dashboard

### "Your authentication token is not from a valid issuer"
- **Cause:** API key is invalid, expired, or from wrong account
- **Fix:** 
  1. Generate a new API key in OpenAI dashboard
  2. Update the environment variable in Netlify
  3. Redeploy the site

### "Insufficient quota"
- **Cause:** No credits/quota in OpenAI account
- **Fix:** Add credits to your OpenAI account

## Security Note:

- Never commit the API key to Git
- Use `OPENAI_API_KEY` (not `NEXT_PUBLIC_OPENAI_API_KEY`) for server-side only
- The API key should only be accessible on the server, not in the browser

