'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

const emojiMap = {
  run: '🏃',
  strength: '🏋️',
  cardio: '❤️',
  hiit: '⚡',
  flexibility: '🧘',
  sport: '⚽',
  other: '💪',
};

const dayEmojiMap = {
  Sunday: '☀️',
  Monday: '🌅',
  Tuesday: '🌤️',
  Wednesday: '🌤️',
  Thursday: '🌙',
  Friday: '🌟',
  Saturday: '🎉',
};

const preGenParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 3}s`,
  duration: `${2 + Math.random() * 2}s`,
  size: 4 + Math.random() * 8,
}));

const slideThemes = [
  { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#ffd700' },
  { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#fff' },
  { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', accent: '#ff6b6b' },
  { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', accent: '#fff' },
  { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', accent: '#667eea' },
  { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', accent: '#fff' },
  { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', accent: '#f093fb' },
  { bg: 'linear-gradient(135deg, #ff8a00 0%, #da1b60 100%)', accent: '#fff' },
];

const bounceKeyframes = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: -15px; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-10px) rotate(5deg); }
    75% { transform: translateY(10px) rotate(-5deg); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
`;

function getTone(workoutCount, totalMinutes, previousWeek, overallAverage) {
  if (!previousWeek) {
    if (workoutCount >= 5) return { emoji: '🔥', text: 'You crushed it!', anim: 'bounce' };
    if (workoutCount >= 3) return { emoji: '💪', text: 'Great week!', anim: 'pulse' };
    if (workoutCount >= 1) return { emoji: '👏', text: 'Nice start!', anim: 'float' };
    return { emoji: '💤', text: 'Rest week?', anim: 'none' };
  }
  
  const diff = workoutCount - previousWeek.workoutCount;
  if (diff >= 2) return { emoji: '🚀', text: 'On fire! Up from last week!', anim: 'bounce' };
  if (diff >= 1) return { emoji: '📈', text: 'You did it! One more than last week!', anim: 'pulse' };
  if (diff === 0) return { emoji: '⚖️', text: 'Consistency is key!', anim: 'float' };
  if (diff >= -1) return { emoji: '💪', text: 'Almost there!', anim: 'pulse' };
  return { emoji: '🌱', text: 'Let\'s build back!', anim: 'float' };
}

function getMinuteTone(current, previous) {
  if (!previous || current === 0) return null;
  const diff = current - previous.totalMinutes;
  if (diff > 30) return { emoji: '⚡', text: `${diff} more minutes than last week!` };
  if (diff > 0) return { emoji: '📈', text: 'More active than last week!' };
  return null;
}

function formatWeek(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function AnimatedNumber({ value, suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(start + (value - start) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
}

function ParticleBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {preGenParticles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            bottom: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            animation: `float ${p.duration} ease-in-out infinite ${p.delay}`,
          }}
        />
      ))}
    </div>
  );
}

export default function WeekInReview({ userId, week, year, onClose, isModal = false }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.users.getWeekInReview(userId, `${year}-${week}`);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch week in review:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    localStorage.setItem(`weekReviewSeen-${year}-${week}`, new Date().toISOString());
  }, [userId, week, year]);

  const nextSlide = () => {
    if (data && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(c => c + 1);
      setAnimKey(k => k + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(c => c - 1);
      setAnimKey(k => k + 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') onClose?.();
  };

  const goToLatest = () => {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((now - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    router.push(`/user/${userId}/week-in-review/${year}-${week}`);
  };

  if (loading) {
    return (
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: slideThemes[0].bg,
        color: 'white',
      }}>
        <style>{bounceKeyframes}</style>
        <div style={{ fontSize: '3rem', animationName: 'bounce', animationDuration: '1s', animationIterationCount: 'infinite' }}>📊</div>
        <p style={{ marginTop: '1rem', opacity: 0.9 }}>Loading your week...</p>
      </div>
    );
  }

  if (!data || data.workoutCount === 0) {
    return (
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: slideThemes[0].bg,
        color: 'white',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{ fontSize: '5rem', animationName: 'float', animationDuration: '3s', animationIterationCount: 'infinite' }}>🏝️</div>
        <h2 style={{ marginTop: '1rem', animationName: 'slideUp', animationDuration: '0.5s', animationTimingFunction: 'ease-out' }}>No workouts this week</h2>
        <p style={{ opacity: 0.8, marginTop: '0.5rem', animation: 'slideUp 0.5s ease-out 0.1s both' }}>
          Log a workout to see your week in review!
        </p>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: '1.5rem', animation: 'slideUp 0.5s ease-out 0.2s both' }} 
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    );
  }

  const { startDate, endDate, workoutCount, totalMinutes, topType, bestDay, previousWeek, streak, overallAverage, weekIsComplete } = data;
  const tone = getTone(workoutCount, totalMinutes, previousWeek, overallAverage);
  const minuteTone = getMinuteTone(totalMinutes, previousWeek);
  const weekDiff = previousWeek ? workoutCount - previousWeek.workoutCount : null;

  const theme = slideThemes[currentSlide % slideThemes.length];

  const slides = [
    {
      emoji: '🎉',
      title: 'Your Week in Review',
      subtitle: formatWeek(startDate, endDate),
      content: (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '5rem', animationName: tone.anim || 'pulse', animationDuration: '1.5s', animationIterationCount: 'infinite' }}>{tone.emoji}</div>
          <p style={{ fontSize: '1.25rem', marginTop: '1rem', animation: 'slideUp 0.5s ease-out 0.2s both' }}>{tone.text}</p>
        </div>
      ),
    },
    {
      emoji: '💪',
      title: (
        <span key={animKey}>
          <AnimatedNumber value={workoutCount} /> workout{workoutCount !== 1 ? 's' : ''} this week!
        </span>
      ),
      subtitle: weekDiff !== null ? (
        weekDiff > 0 ? `↑ ${weekDiff} more than ${data.previousWeekLabel}` :
        weekDiff < 0 ? `↓ ${Math.abs(weekDiff)} less than ${data.previousWeekLabel}` :
        `Same as ${data.previousWeekLabel}`
      ) : null,
      content: null,
    },
    {
      emoji: '⏱️',
      title: <AnimatedNumber value={totalMinutes} suffix=" active minutes" />,
      subtitle: minuteTone ? minuteTone.text : null,
      content: null,
    },
    {
      emoji: '🔥',
      title: (
        <span key={animKey}>
          <AnimatedNumber value={streak} /> day streak
        </span>
      ),
      subtitle: streak > 0 ? streak >= 7 ? 'Incredible consistency!' : 'Keep it going!' : 'Start a streak!',
      content: null,
    },
    topType ? {
      emoji: emojiMap[topType] || '⭐',
      title: `Your go-to: ${topType.charAt(0).toUpperCase() + topType.slice(1)}`,
      subtitle: 'Most frequent workout type this week',
      content: <div style={{ fontSize: '4rem', marginTop: '1rem', animationName: 'bounce', animationDuration: '1s', animationIterationCount: 'infinite' }}>{emojiMap[topType] || '⭐'}</div>,
    } : null,
    bestDay ? {
      emoji: dayEmojiMap[bestDay] || '📅',
      title: `${bestDay} was your day!`,
      subtitle: 'Most workouts on this day',
      content: <div style={{ fontSize: '4rem', marginTop: '1rem', animationName: 'popIn', animationDuration: '0.5s', animationTimingFunction: 'ease-out' }}>{dayEmojiMap[bestDay] || '📅'}</div>,
    } : null,
    {
      emoji: '📊',
      title: `Average: ${overallAverage} workouts/week`,
      subtitle: workoutCount > overallAverage ? 'Above average!' : workoutCount === overallAverage ? 'Right on track!' : 'One more to beat your average!',
      content: null,
    },
    {
      emoji: weekIsComplete ? '✅' : '📝',
      title: weekIsComplete ? 'Week complete!' : 'Week in progress',
      subtitle: weekIsComplete ? 'Great work!' : 'Keep it up!',
      content: (
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '280px' }}>
          <button className="btn" style={{ background: 'white', color: theme.bg.split(' ')[1], fontWeight: 600 }} onClick={goToLatest}>
            See Latest Week
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            {isModal ? 'Close' : 'Back to Profile'}
          </button>
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        height: '500px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '1rem',
        background: theme.bg,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <style>{bounceKeyframes}</style>
      <ParticleBackground />
      
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          zIndex: 10,
          color: 'white',
        }}
      >
        ×
      </button>

      {slides.map((slide, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
            boxSizing: 'border-box',
            color: 'white',
            opacity: index === currentSlide ? 1 : 0,
            transform: index === currentSlide 
              ? 'translateX(0) scale(1)' 
              : index > currentSlide 
                ? 'translateX(100%) scale(0.8)' 
                : 'translateX(-100%) scale(0.8)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: index === currentSlide ? 'auto' : 'none',
          }}
        >
          {slide.emoji && (
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '0.5rem',
              animation: index === currentSlide ? 'popIn 0.4s ease-out 0.1s both' : 'none',
            }}>
              {slide.emoji}
            </div>
          )}
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 700, 
            margin: 0,
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
            animation: index === currentSlide ? 'slideUp 0.5s ease-out 0.15s both' : 'none',
          }}>
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p style={{ 
              marginTop: '0.5rem', 
              fontSize: '1rem',
              opacity: 0.9,
              animation: index === currentSlide ? 'slideUp 0.5s ease-out 0.3s both' : 'none',
            }}>
              {slide.subtitle}
            </p>
          )}
          {slide.content && (
            <div style={{
              animation: index === currentSlide ? 'slideUp 0.5s ease-out 0.4s both' : 'none',
            }}>
              {slide.content}
            </div>
          )}
        </div>
      ))}

      {currentSlide < slides.length - 1 && (
        <button
          onClick={nextSlide}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            right: '1rem',
            background: 'white',
            color: theme.bg.split(' ')[1],
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 10,
            transition: 'transform 0.2s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          →
        </button>
      )}
      
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '1rem',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white',
            zIndex: 10,
          }}
        >
          ←
        </button>
      )}

      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
      }}>
        {slides.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === currentSlide ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: index === currentSlide ? 'white' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
