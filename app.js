const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Put index.html inside /public

const port = 3000;

const shortCode = process.env.SHORTCODE;
const passkey = process.env.PASSKEY;
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const callbackUrl = 'https://your-ngrok-url/pay/callback'; // Use ngrok in development

// Get Access Token
async function getAccessToken() {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data } = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` },
  });
  return data.access_token;
}

// STK Push Request
app.post('/pay', async (req, res) => {
  const { phone } = req.body;
  const amount = 500;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
  const token = await getAccessToken();

  try {
    const stkRes = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: 'Book001',
        TransactionDesc: 'Buy Book',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

    res.json({ message: 'STK Push sent to your phone. Please complete the payment.' });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ message: 'Payment failed. Try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
