import express from 'express';
import { httpLogger } from './config/logger.js';
const app = express();

app.use(express.json());
app.use(httpLogger);

app.get('/api/v1/health', async (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
