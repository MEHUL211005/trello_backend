const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// `replyTo` ({ email, name }) makes "Reply" in the recipient's mail app
// answer that person instead of the no-reply sender.
const sendEmail = async ({ to, subject, html, replyTo }) => {
  try {
    await apiInstance.sendTransacEmail({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'TaskSphere',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      ...(replyTo ? { replyTo } : {}),
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