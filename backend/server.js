import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './src/routes/auth.js';
import workoutsRoutes from './src/routes/workouts.js';
import cheersRoutes from './src/routes/cheers.js';
import teamRoutes from './src/routes/team.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.FLEX_BACKEND_PORT || 4001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/cheers', cheersRoutes);
app.use('/api/team', teamRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Flex API running on http://0.0.0.0:${PORT}`);
});
