import express from 'express';
import cors from 'cors';
import mapRouter from './routes/map';
import weatherRouter from './routes/weather';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import visualizeRouter from './routes/visualize';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fenceai-backend' });
});

app.use('/api/map', mapRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/visualize', visualizeRouter);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/send-sms-code');
  console.log('  POST /api/auth/verify-sms-code');
  console.log('  POST /api/auth/qr/create');
  console.log('  POST /api/auth/qr/consume');
  console.log('  GET  /api/projects');
  console.log('  POST /api/projects');
  console.log('  POST /api/visualize');
  console.log('  GET  /health');
  console.log('  GET  /api/weather?lat=&lng=');
  console.log('  GET  /api/map/objects?status=active|done');
  console.log('  GET  /api/map/objects/:id');
  console.log('  POST /api/map/objects');
  console.log('  PATCH /api/map/objects/:id');
  console.log('  DELETE /api/map/objects/:id');
});
