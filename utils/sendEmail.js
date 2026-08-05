const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({ to, subject, html }) => {
  try {
    await apiInstance.sendTransacEmail({
      sender: {
        name: 'TRELLO',
        email: 'mihul@softradix.in',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    console.log('Email sent to:', to);
  } catch (error) {
    console.error(
      'Brevo error:',
      error.response?.body || error.message
    );
    throw error;
  }
};

module.exports = sendEmail;