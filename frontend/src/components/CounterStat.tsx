'use client';

import { useEffect, useRef, useState } from 'react';

interface CounterStatProps {
  number: number;
  label: string;
  suffix?: string;
  icon?: string;
}

const CounterStat: React.FC<CounterStatProps> = ({ number, label, suffix = '', icon }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const duration = 2000;
    const increment = number / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= number) {
        setCount(number);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, number]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
    >
      {icon && <div className="text-5xl">{icon}</div>}
      <div className="text-4xl sm:text-5xl font-bold text-white">
        {count}
        <span className="text-2xl ml-1">{suffix}</span>
      </div>
      <p className="text-white/80 text-center">{label}</p>
    </div>
  );
};

export default CounterStat;
