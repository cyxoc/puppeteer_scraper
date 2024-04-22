import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin())

let browser;

async function crawlUrl(url) {
  if (!browser) {
    browser = await puppeteer.launch({ headless: 'new' });
  }
  const page = await browser.newPage();
  await page.mouse.move(Math.random() * 800, Math.random() * 600); // Random mouse movement

  // Implement browser fingerprinting
  await page.setViewport({ width: 1366, height: 768 }); // Set viewport size
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36'); // Set user-agent

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || null,
      body: document.body.innerText
    };
  });

  await page.close();
  return metadata;
}

const sampleUrls = [
  "http://www.amazon.com/Cuisinart-CPT-122-Compact-2-Slice-Toaster/dp/B009GQ034C/ref=sr_1_1?s=kitchen&ie=UTF8&qid=1431620315&sr=1-1&keywords=toaster",
  "http://blog.rei.com/camp/how-to-introduce-your-indoorsy-friend-to-the-outdoors/",
  "http://www.cnn.com/2013/06/10/politics/edward-snowden-profile/"
];

async function main() {
  for (const url of sampleUrls) {
    console.log(`Extracting metadata from URL: ${url}`);
    const metadata = await crawlUrl(url);
    console.log(metadata);
  }

  await browser.close();
}

main();
