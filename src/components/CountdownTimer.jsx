'use client';
import { useState, useEffect, useRef } from 'react';

export function CountdownTimer({ raceDate, raceName }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const raceDateRef = useRef(raceDate);

  useEffect(() => {
    raceDateRef.current = raceDate;
  }, [raceDate]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(raceDateRef.current) - new Date();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft.total <= 0) {
    return (
      <div className="countdown-banner countdown-past">
        {raceName} has passed!
      </div>
    );
  }

  return (
    <div className="countdown-banner">
      <span className="countdown-name">{raceName}</span>
      <span className="countdown-time">
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}
