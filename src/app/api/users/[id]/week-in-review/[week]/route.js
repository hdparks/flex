import { NextResponse } from 'next/server';
import db from '@/lib/db';

function getWeekDates(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const startDate = new Date(simple);
  startDate.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function getWeekStats(userId, startDate, endDate) {
  const workouts = await db.prepare(`
    SELECT * FROM workouts 
    WHERE user_id = ? 
    AND date(completed_at) >= ? 
    AND date(completed_at) <= ?
  `).all(userId, startDate, endDate);

  const participants = await db.prepare(`
    SELECT w.* FROM workout_participants p
    JOIN workouts w ON p.workout_id = w.id
    WHERE p.user_id = ?
    AND date(w.completed_at) >= ?
    AND date(w.completed_at) <= ?
  `).all(userId, startDate, endDate);

  const allWorkouts = [...workouts, ...participants];
  const totalMinutes = allWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  const typeCounts = {};
  const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  allWorkouts.forEach(w => {
    const day = new Date(w.completed_at).getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
  });

  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    workoutCount: allWorkouts.length,
    totalMinutes,
    topType: topType ? topType[0] : null,
    topTypeCount: topType ? topType[1] : 0,
    bestDay: bestDay && bestDay[1] > 0 ? days[bestDay[0]] : null,
    bestDayCount: bestDay ? bestDay[1] : 0,
  };
}

async function getStreak(userId, endDate) {
  const end = new Date(endDate);
  let streak = 0;
  
  for (let i = 0; i <= 30; i++) {
    const checkDate = new Date(end);
    checkDate.setDate(end.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const workouts = await db.prepare(`
      SELECT COUNT(*) as count FROM workouts 
      WHERE user_id = ? AND date(completed_at) = ?
    `).get(userId, dateStr);
    
    const participants = await db.prepare(`
      SELECT COUNT(*) as count FROM workout_participants p
      JOIN workouts w ON p.workout_id = w.id
      WHERE p.user_id = ? AND date(w.completed_at) = ?
    `).get(userId, dateStr);

    if ((workouts.count || 0) + (participants.count || 0) > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  return streak;
}

async function getOverallAverage(userId) {
  const result = await db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM workouts WHERE user_id = ?) +
      (SELECT COUNT(*) FROM workout_participants WHERE user_id = ?) as total_workouts,
      (SELECT MIN(date(completed_at)) FROM workouts WHERE user_id = ?) as first_workout
  `).get(userId, userId, userId);

  if (!result.first_workout) return 0;

  const first = new Date(result.first_workout);
  const now = new Date();
  const weeks = Math.max(1, Math.ceil((now - first) / (7 * 24 * 60 * 60 * 1000)));
  
  return Math.round(result.total_workouts / weeks * 10) / 10;
}

export async function GET(request, { params }) {
  try {
    const { id, week } = await params;
    const [year, weekNum] = week.split('-').map(Number);

    if (!year || !weekNum || weekNum < 1 || weekNum > 53) {
      return NextResponse.json({ error: 'Invalid week format. Use YYYY-WW' }, { status: 400 });
    }

    const user = await db.prepare('SELECT id, username, avatar_url FROM users WHERE id = ?').get(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { startDate, endDate } = getWeekDates(year, weekNum);
    
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    const weekIsComplete = (year < currentYear) || (year === currentYear && weekNum < currentWeek);

    const stats = await getWeekStats(id, startDate, endDate);
    
    let previousWeekStats = null;
    let previousWeekLabel = null;
    
    if (weekNum > 1) {
      const { startDate: prevStart, endDate: prevEnd } = getWeekDates(year, weekNum - 1);
      previousWeekStats = await getWeekStats(id, prevStart, prevEnd);
      previousWeekLabel = `Week ${weekNum - 1}`;
    } else if (year > 1) {
      const { startDate: prevStart, endDate: prevEnd } = getWeekDates(year - 1, 52);
      previousWeekStats = await getWeekStats(id, prevStart, prevEnd);
      previousWeekLabel = 'Week 52';
    }

    const streak = await getStreak(id, endDate);
    const overallAverage = await getOverallAverage(id);

    return NextResponse.json({
      userId: id,
      username: user.username,
      avatarUrl: user.avatar_url,
      week: weekNum,
      year,
      startDate,
      endDate,
      weekIsComplete,
      ...stats,
      previousWeek: previousWeekStats,
      previousWeekLabel,
      streak,
      overallAverage,
    });
  } catch (err) {
    console.error('Week in review error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
