const amqp = require('amqplib/callback_api');
const mysql = require('mysql');

// MySQL database connection configuration
const dbConfig = {
  host: 'localhost', // Replace with your MySQL host
  user: 'username', // Replace with your MySQL username
  password: 'password', // Replace with your MySQL password
  database: 'mydatabase' // Replace with your MySQL database name
};

// RabbitMQ connection URL
const rabbitmqUrl = 'amqp://rabbitmq'; // Replace 'rabbitmq' with the hostname of your RabbitMQ service in Kubernetes

// Function to connect to MySQL database and retrieve URLs
function fetchUrlsFromDatabase() {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection(dbConfig);

    connection.connect((error) => {
      if (error) {
        reject(error);
        return;
      }

      const query = 'SELECT url FROM urls_table'; // Replace with your MySQL query to select URLs

      connection.query(query, (error, results) => {
        if (error) {
          reject(error);
          return;
        }

        const urls = results.map(row => row.url);
        resolve(urls);

        connection.end(); // Close the database connection
      });
    });
  });
}

// Function to send URLs to RabbitMQ for distribution
async function sendUrlsToRabbitMQ(urls) {
  amqp.connect(rabbitmqUrl, (error, connection) => {
    if (error) {
      console.error(`Error connecting to RabbitMQ: ${error.message}`);
      return;
    }

    connection.createChannel((error, channel) => {
      if (error) {
        console.error(`Error creating RabbitMQ channel: ${error.message}`);
        return;
      }

      const queue = 'urls';

      channel.assertQueue(queue, { durable: true });

      urls.forEach(url => {
        channel.sendToQueue(queue, Buffer.from(url), { persistent: true });
        console.log(`[x] Sent URL to RabbitMQ: ${url}`);
      });

      setTimeout(() => {
        connection.close();
      }, 500);
    });
  });
}

// Main function to fetch URLs from database and send them to RabbitMQ
async function main() {
  try {
    const urls = await fetchUrlsFromDatabase();
    await sendUrlsToRabbitMQ(urls);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

main();
