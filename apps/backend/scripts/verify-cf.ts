import 'dotenv/config';
import Cloudflare from 'cloudflare';
import path from 'path';

// Load .env from root if not loaded (dotenv/config usually loads from cwd, but we might be running from root)
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function verifyCloudflare() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken) {
    console.error('❌ CLOUDFLARE_API_TOKEN not found in environment');
    process.exit(1);
  }

  console.log('🔄 Initializing Cloudflare client...');
  const client = new Cloudflare({
    apiToken: apiToken,
  });

  try {
    console.log('🔄 Verifying Token...');
    const verify = await client.user.tokens.verify();
    console.log('✅ Token Verified:', verify.message);
    if (verify.status !== 'active') {
        console.error('❌ Token status is not active:', verify.status);
    }

    console.log('🔄 Fetching Account Details...');
    // Try to list accounts or check specific account
    if (accountId) {
      console.log(`ℹ️ Using Account ID: ${accountId}`);
      try {
        const account = await client.accounts.get({ account_id: accountId });
        console.log('✅ Account Found:', account.name, `(${account.id})`);
      } catch (err: any) {
        console.error('⚠️ Could not fetch specific account details:', err.message);
      }
    } else {
      console.log('ℹ️ No CLOUDFLARE_ACCOUNT_ID provided, listing accounts...');
      const accounts = await client.accounts.list();
      for (const acc of accounts.result) {
        console.log(`- ${acc.name} (${acc.id})`);
      }
    }

    console.log('✅ Cloudflare integration verified successfully!');

  } catch (error: any) {
    console.error('❌ Cloudflare verification failed:', error);
    process.exit(1);
  }
}

verifyCloudflare();
