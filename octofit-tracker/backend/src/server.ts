import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { Activity, Leaderboard, Team, User, Workout } from './models/index.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/api/users', async (_request, response) => {
  response.json(await User.find().select('name grade team').populate('team', 'name color').sort('name'));
});
app.get('/api/teams', async (_request, response) => {
  response.json(await Team.find().sort('name'));
});
app.get('/api/activities', async (_request, response) => {
  response.json(await Activity.find().populate('user', 'name').sort({ date: -1 }).limit(100));
});
app.get('/api/leaderboard', async (_request, response) => {
  response.json(await Leaderboard.find().populate('user', 'name team').sort({ points: -1 }));
});
app.get('/api/workouts', async (_request, response) => {
  response.json(await Workout.find().sort('duration'));
});

app.post('/api/users', async (request, response) => {
  const { name, email, grade, team } = request.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
      !Number.isInteger(grade) || grade < 9 || grade > 12 || !mongoose.isValidObjectId(team) ||
      !await Team.exists({ _id: team })) {
    response.status(400).json({ error: 'Enter a name, email, grade (9-12), and valid team.' });
    return;
  }
  try {
    const user = await User.create({ name: name.trim(), email: email.trim(), grade, team });
    await Leaderboard.create({ user: user._id, points: 0 });
    response.status(201).json(await User.findById(user._id).select('name grade team').populate('team', 'name color'));
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      response.status(409).json({ error: 'That email is already registered.' });
      return;
    }
    throw error;
  }
});

app.post('/api/activities', async (request, response) => {
  const { user, type, duration } = request.body;
  if (!mongoose.isValidObjectId(user) || !await User.exists({ _id: user }) ||
      !['Running', 'Walking', 'Strength', 'Cycling', 'Yoga'].includes(type) ||
      !Number.isInteger(duration) || duration < 1 || duration > 600) {
    response.status(400).json({ error: 'Select a student, activity, and duration (1-600 minutes).' });
    return;
  }
  const activity = await Activity.create({ user, type, duration });
  await Leaderboard.updateOne({ user }, { $inc: { points: duration } }, { upsert: true });
  response.status(201).json(await activity.populate('user', 'name'));
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong.' });
});

connectDatabase()
  .then(() => app.listen(8000, '0.0.0.0', () => console.log('API listening on port 8000')))
  .catch((error) => {
    console.error('Unable to start API:', error);
    process.exit(1);
  });