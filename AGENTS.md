# Project AI Instructions

## Environment Files and Secrets

Environment files are strictly protected.

NEVER read, inspect, search, modify, overwrite, delete, rename, or move:

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.test`
- `.env.*`

Never inspect files containing:

- API keys
- access tokens
- passwords
- database credentials
- private keys
- authentication secrets

Never ask the user to paste a secret into the conversation.

## Environment Variables

When a feature requires an environment variable:

1. Do not access the actual environment file.
2. Refer only to the variable name.
3. Explain what the variable is required for.
4. Tell the user where to configure it.
5. Use a placeholder value only.

Example:

```env
XX_API_KEY=<your-api-key>