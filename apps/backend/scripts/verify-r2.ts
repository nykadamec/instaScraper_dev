import 'dotenv/config';
import Cloudflare from 'cloudflare';
import fs from 'fs';
import path from 'path';

// Load .dev.vars manually since dotenv loads .env
const devVarsPath = path.resolve(__dirname, '../.dev.vars');
const devVarsContent = fs.readFileSync(devVarsPath, 'utf-8');
const envConfig = Object.fromEntries(
  devVarsContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim()];
    })
);

async function verifyR2() {
  const accountId = envConfig.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = envConfig.CLOUDFLARE_R2_TOKEN || envConfig.CLOUDFLARE_API_TOKEN;

  console.log('ℹ️ Account ID:', accountId);
  console.log('ℹ️ Using Token:', apiToken ? `${apiToken.substring(0, 5)}...` : 'None');

  if (!apiToken || !accountId) {
    console.error('❌ Missing credentials in .dev.vars');
    process.exit(1);
  }

  const client = new Cloudflare({
    apiToken: apiToken,
  });

  try {
    console.log('🔄 Verifying R2 Token permissions...');
    try {
        const verify = await client.user.tokens.verify();
        console.log('✅ Token Status:', verify.status);
    } catch (vErr: any) {
        console.warn('⚠️ Token verification failed (might lack permission to verify itself), proceeding to R2 check...', vErr.message);
    }

    console.log('🔄 Listing R2 Buckets...');
    const buckets = await client.r2.buckets.list({ account_id: accountId });
    
    console.log('📦 API Response Result:', JSON.stringify(buckets, null, 2));
    
    // Cloudflare SDK v4+ returns the result directly in some methods or via .result
    // The previous error in IDE suggested 'result' does not exist on BucketListResponse
    // Let's inspect what we actually got. If 'buckets' is an array, iterate it.
    const bucketList = Array.isArray(buckets) ? buckets : (buckets as any).result || (buckets as any).buckets;

    if (bucketList && bucketList.length > 0) {
        console.log(`✅ Found ${bucketList.length} buckets.`);
        bucketList.forEach((b: any) => console.log(` - ${b.name}`));
    } else {
        console.log('⚠️ No buckets returned in the list.');
    }

  } catch (error: any) {
    console.error('❌ R2 Verification Failed:', error);
    if (error.response) {
        console.error('Response Body:', await error.response.text());
    }
  }
}

verifyR2();
