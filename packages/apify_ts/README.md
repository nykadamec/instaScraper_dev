# 🚀 Apify Client for TypeScript

<p align="center">
  <a href="https://apify.com" target="_blank">
    <img src="https://apify.com/img/brand/logo.svg" alt="Apify Logo" width="200" />
  </a>
</p>

<p align="center">
  <b>A standalone, strongly-typed TypeScript SDK for the Apify API.</b>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-development">Development</a> •
  <a href="#-license">License</a>
</p>

---

## ✨ Features

- 🛡️ **Type-Safe**: Full TypeScript support with strict interfaces for all resources.
- 🧩 **Modular**: Independent clients for Actors, Runs, and Datasets.
- 🔁 **Robust**: Automatic error handling, retries (via Axios), and log streaming.
- 📦 **Standalone**: Zero dependencies on root monorepo, works in isolation.

## 📦 Installation

```bash
npm install apify-client-ts
# or
pnpm add apify-client-ts
```

## ⚙️ Configuration

Create a `.env` file in your project root:

```env
# 🔑 Apify API Token (Required)
# https://console.apify.com/account/integrations
APIFY_TOKEN=your_apify_token_here

# 🤖 Default Actor ID (Optional)
APIFY_ACTOR_ID=your_actor_id_here
```

## 🚀 Usage

### Basic Example

```typescript
import { ApifyClient } from 'apify-client-ts';

async function main() {
  // 1️⃣ Initialize (loads APIFY_TOKEN from env)
  const client = new ApifyClient();

  // 2️⃣ Define Input (e.g., Instagram Scraper)
  const input = {
    directUrls: ['https://www.instagram.com/p/DSA_KX8kUfd/'],
    resultsType: 'details',
    searchLimit: 1,
  };

  try {
    console.log('🎬 Starting actor run...');
    
    // 3️⃣ Start Run (uses APIFY_ACTOR_ID from env)
    const run = await client.actor().start(input);
    console.log(`🆔 Run started: ${run.id}`);

    // 4️⃣ Wait for Completion
    console.log('⏳ Waiting for finish...');
    const finishedRun = await client.run(run.id).waitForFinish();

    if (finishedRun.status === 'SUCCEEDED') {
      // 5️⃣ Fetch Results
      const { items } = await client.dataset(finishedRun.defaultDatasetId).listItems();
      
      console.log(`✅ Scraped ${items.length} items.`);
      if (items.length > 0) console.log('📄 Sample:', items[0]);
    } else {
      console.error(`❌ Run failed: ${finishedRun.status}`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

main();
```

### Advanced Usage

#### 🔧 Manual Configuration

```typescript
const client = new ApifyClient({
  token: 'my-specific-token',
});

// Target specific actor
const specificActor = client.actor('some-other-actor-id');
```

#### 📜 Log Streaming

```typescript
// Stream logs to stdout
const logStream = await client.run(run.id).streamLog();
logStream.pipe(process.stdout);
```

## 🛠️ Development

```bash
# Install
npm install

# Type Check
npm run type-check

# Test
npm test
```

## 📄 License

MIT © [nykadamec](https://github.com/nykadamec)
