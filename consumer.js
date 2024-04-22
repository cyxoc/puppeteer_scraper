const amqp = require('amqplib');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mysql = require('mysql');
const AWS = require('aws-sdk');

puppeteer.use(StealthPlugin());

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

  const title = await page.title();
  const description = await page.$eval('meta[name="description"]', element => element.content);

  const body = await page.evaluate(() => {
    return document.body.innerText;
  });

  await page.close();
  return { title, description, body };
}

async function storeInDatabase(title, description) {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'username',
    password: 'password',
    database: 'mydatabase'
  });

  connection.connect();

  const query = 'INSERT INTO metadata (title, description) VALUES (?, ?)';
  const values = [title, description];

  connection.query(query, values, (error, results, fields) => {
    if (error) {
      console.error(`Error storing metadata in database: ${error.message}`);
    } else {
      console.log(`Metadata stored successfully in database.`);
    }
  });

  connection.end();
}

async function storeInS3(body) {
  const s3 = new AWS.S3({
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    secretAccessKey: 'YOUR_SECRET_ACCESS_KEY'
  });

  const params = {
    Bucket: 'your-bucket-name',
    Key: 'filename.txt',
    Body: body
  };

  s3.upload(params, (error, data) => {
    if (error) {
      console.error(`Error storing body content in AWS S3: ${error.message}`);
    } else {
      console.log(`Body content stored successfully in AWS S3.`);
    }
  });
}

async function consumeMessages() {
  try {
    const connection = await amqp.connect('amqp://localhost'); // Replace 'localhost' with your RabbitMQ server URL
    const channel = await connection.createChannel();
    const queue = 'urls';

    await channel.assertQueue(queue, { durable: true });
    console.log(`[*] Waiting for messages in ${queue}. To exit, press CTRL+C`);

    channel.consume(queue, async (msg) => {
      const url = msg.content.toString();
      console.log(`[x] Received URL: ${url}`);

      try {
        const { title, description, body } = await crawlUrl(url);
        console.log({ title, description });

        // Store title and description in MySQL
        await storeInDatabase(title, description);

        // Store body in AWS S3
        await storeInS3(body);
      } catch (error) {
        console.error(`Error processing URL ${url}: ${error.message}`);
      } finally {
        channel.ack(msg);
      }
    }, { noAck: false });
  } catch (error) {
    console.error(`Error consuming messages: ${error.message}`);
  }
}

consumeMessages();
