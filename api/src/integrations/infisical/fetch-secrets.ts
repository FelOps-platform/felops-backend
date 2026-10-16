import { InfisicalSDK } from '@infisical/sdk';

const fetchSecrets = async () => {
  const infisicalSdk = new InfisicalSDK();

  if (
    !process.env.INFISICAL_CLIENT_ID ||
    !process.env.INFISICAL_CLIENT_SECRET ||
    !process.env.INFISICAL_PROJECT_ID
  ) {
    throw new Error(
      'Infisical client ID, secret, and project ID must be set in environment variables.',
    );
  }

  const client = await infisicalSdk.auth().universalAuth.login({
    clientId: process.env.INFISICAL_CLIENT_ID,
    clientSecret: process.env.INFISICAL_CLIENT_SECRET,
  });

  const secretsList = await client.secrets().listSecrets({
    environment: process.env.NODE_ENV || 'development',
    projectId: process.env.INFISICAL_PROJECT_ID,
  });

  return secretsList.secrets.reduce((acc: Record<string, string>, curr) => {
    acc[curr.secretKey] = curr.secretValue;
    return acc;
  }, {});
};

export default fetchSecrets;
