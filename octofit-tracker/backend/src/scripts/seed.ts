import mongoose from 'mongoose';
import { Activity, Leaderboard, Team, User, Workout } from '../models/index.js';

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/octofit_db';

async function seedDatabase() {
  try {
    await mongoose.connect(connectionString);

    console.log('Connected to octofit_db');

    const teams = [
      { name: 'Comets', color: '#e46948' },
      { name: 'Tide', color: '#267e83' },
      { name: 'Sparks', color: '#e3aa39' },
    ];
    const teamIds = new Map<string, mongoose.Types.ObjectId>();
    for (const team of teams) {
      const record = await Team.findOneAndUpdate({ name: team.name }, team, { upsert: true, new: true });
      teamIds.set(team.name, record._id);
    }

    const users = [
      { name: 'Avery Chen', email: 'avery@example.test', grade: 10, team: 'Comets' },
      { name: 'Jordan Lee', email: 'jordan@example.test', grade: 11, team: 'Tide' },
      { name: 'Sam Rivera', email: 'sam@example.test', grade: 9, team: 'Sparks' },
      { name: 'Taylor Brooks', email: 'taylor@example.test', grade: 12, team: 'Comets' },
    ];
    const userIds = new Map<string, mongoose.Types.ObjectId>();
    for (const user of users) {
      const record = await User.findOneAndUpdate(
        { email: user.email },
        { name: user.name, email: user.email, grade: user.grade, team: teamIds.get(user.team) },
        { upsert: true, new: true },
      );
      userIds.set(user.email, record._id);
    }

    const activities = [
      { email: 'avery@example.test', type: 'Running', duration: 35, daysAgo: 0 },
      { email: 'jordan@example.test', type: 'Cycling', duration: 45, daysAgo: 1 },
      { email: 'sam@example.test', type: 'Walking', duration: 30, daysAgo: 2 },
      { email: 'taylor@example.test', type: 'Strength', duration: 40, daysAgo: 3 },
      { email: 'avery@example.test', type: 'Yoga', duration: 25, daysAgo: 4 },
      { email: 'jordan@example.test', type: 'Running', duration: 28, daysAgo: 5 },
    ];
    for (const [index, activity] of activities.entries()) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - activity.daysAgo);
      date.setUTCHours(0, 0, 0, 0);
      await Activity.updateOne(
        { seedKey: `demo-${index}` },
        { $set: { user: userIds.get(activity.email), type: activity.type, duration: activity.duration, date } },
        { upsert: true },
      );
    }

    const workouts = [
      { title: 'First Steps', level: 'Beginner', duration: 20, description: 'An easy walk and stretch to get moving.' },
      { title: 'Track Tempo', level: 'Intermediate', duration: 30, description: 'Alternate jogging and brisk walking intervals.' },
      { title: 'Strength Circuit', level: 'Advanced', duration: 40, description: 'Bodyweight rounds for full-body conditioning.' },
    ];
    for (const workout of workouts) {
      await Workout.updateOne({ title: workout.title }, { $set: workout }, { upsert: true });
    }

    for (const userId of userIds.values()) {
      const activitiesForUser = await Activity.find({ user: userId });
      const points = activitiesForUser.reduce((total, activity) => total + activity.duration, 0);
      await Leaderboard.updateOne({ user: userId }, { $set: { points } }, { upsert: true });
    }

    console.log('Database seeding complete');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
