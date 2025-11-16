'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '@heroicons/react/24/solid';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
}

const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({
  testimonials,
  autoplay = true,
  autoplayInterval = 5000,
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, testimonials.length]);

  const goToPrevious = () => {
    setCurrent((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[current];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Testimonial Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 min-h-80 flex flex-col justify-between">
        {/* Rating */}
        {currentTestimonial.rating && (
          <div className="flex gap-1 mb-4">
            {Array.from({ length: currentTestimonial.rating }).map((_, i) => (
              <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
            ))}
          </div>
        )}

        {/* Quote */}
        <p className="text-lg sm:text-xl text-white mb-8 italic">
          "{currentTestimonial.content}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-4">
          {currentTestimonial.avatar && (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xl border border-white/20">
              {currentTestimonial.avatar}
            </div>
          )}
          <div>
            <p className="font-semibold text-white">{currentTestimonial.name}</p>
            <p className="text-white/60 text-sm">{currentTestimonial.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-8">
        <div className="flex gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === current ? 'bg-white w-8' : 'bg-white/40'
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={goToPrevious}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            aria-label="Previous testimonial"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            aria-label="Next testimonial"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCarousel;
