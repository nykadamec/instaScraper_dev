import { ApifyClient } from './src';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const TARGET_URL = 'https://www.instagram.com/p/DSA_KX8kUfd/';

async function main() {
    console.log('--- Starting Actor Run Test with Environment Variables ---');

    // 1. Initialize Client without arguments
    // It should pick up APIFY_TOKEN from process.env
    console.log('[1] Initializing Client...');
    const client = new ApifyClient();
    
    // Check where token comes from
    if (client.httpClient.token) {
        console.log('✅ API Token loaded successfully.');
        // We won't print the full token for security, just a fragment
        console.log(`   Token source: process.env.APIFY_TOKEN (starts with ${client.httpClient.token.substring(0, 10)}...)`);
    } else {
        console.error('❌ API Token missing!');
        process.exit(1);
    }

    try {
        const input = {
            directUrls: [TARGET_URL],
            resultsType: 'details',
            searchLimit: 1,
        };

        // 2. Start Run without specifying Actor ID
        // It should pick up APIFY_ACTOR_ID from process.env
        console.log('\n[2] Starting Actor Run (using default Actor ID from env)...');
        
        // We can verify what ID it will use by checking process.env
        console.log(`   Target Actor ID source: process.env.APIFY_ACTOR_ID = ${process.env.APIFY_ACTOR_ID}`);
        
        const run = await client.actor().start(input);
        
        console.log(`\n✅ Run started successfully!`);
        console.log(`   Run ID: ${run.id}`);
        console.log(`   Status: ${run.status}`);

        // 3. Wait for Finish
        console.log(`\n[3] Waiting for run to complete...`);
        const finishedRun = await client.run(run.id).waitForFinish({ checkIntervalSecs: 5 });

        console.log(`✅ Run finished!`);
        console.log(`   Final Status: ${finishedRun.status}`);

        if (finishedRun.status === 'SUCCEEDED') {
            // 4. Get Results
            console.log(`\n[4] Fetching results...`);
            const datasetClient = client.dataset(finishedRun.defaultDatasetId);
            const results = await datasetClient.listItems();

            console.log(`✅ Retrieved ${results.count} items.`);
            if (results.count > 0) {
                console.log('   Sample Item (First Result):');
                console.log(JSON.stringify(results.items[0], null, 2));
            }
        } else {
            console.error('❌ Run failed or was aborted.');
        }

    } catch (error: any) {
        console.error('\n❌ An error occurred:');
        console.error(error.message);
    }
}

main().catch(console.error);
