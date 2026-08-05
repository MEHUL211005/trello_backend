const express = require('express');
const router = express.Router();

const sendEmail = require('../utils/sendEmail');

router.get('/email', async (req, res) => {
  try {
    await sendEmail({
      to: 'mihul@softradix.in',
      subject: 'Trello Test Email',
      html: '<h2>Hello Mehul </h2><p>Brevo is working successfully.</p>',
    });

    res.send('Email sent');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send email');
  }
});

module.exports = router;