import * as SibApiV3Sdk from '@sendinblue/client';

const API_KEY = process.env.BREVO_API_KEY || '';
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@construescala.com';
const senderName = process.env.BREVO_SENDER_NAME || 'CONSTRUESCALA Hospitality';

let apiInstance: SibApiV3Sdk.TransactionalEmailsApi | null = null;

const getApiInstance = () => {
  if (!apiInstance && API_KEY) {
    apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, API_KEY);
  }
  return apiInstance;
};

export interface SendEmailParams {
  to: { email: string; name?: string }[];
  templateId: number;
  params: Record<string, string>;
  tags?: string[];
}

export const sendTransactionalEmail = async (params: SendEmailParams): Promise<boolean> => {
  const api = getApiInstance();
  if (!api) {
    console.warn('Brevo API not configured');
    return false;
  }

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: senderEmail, name: senderName };
    sendSmtpEmail.to = params.to;
    sendSmtpEmail.templateId = params.templateId;
    sendSmtpEmail.params = params.params;
    if (params.tags) {
      sendSmtpEmail.tags = params.tags;
    }

    await api.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return false;
  }
};

// Template IDs (configurar en panel de Brevo)
export const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMED_GUEST: parseInt(process.env.BREVO_TEMPLATE_BOOKING_GUEST || '1'),
  BOOKING_CONFIRMED_HOST: parseInt(process.env.BREVO_TEMPLATE_BOOKING_HOST || '2'),
  PAYOUT_EXECUTED: parseInt(process.env.BREVO_TEMPLATE_PAYOUT || '3'),
  BOOKING_CANCELLED: parseInt(process.env.BREVO_TEMPLATE_CANCEL || '4'),
  REVIEW_RECEIVED: parseInt(process.env.BREVO_TEMPLATE_REVIEW || '5'),
  KYC_APPROVED: parseInt(process.env.BREVO_TEMPLATE_KYC_APPROVED || '6'),
  KYC_REJECTED: parseInt(process.env.BREVO_TEMPLATE_KYC_REJECTED || '7'),
};
