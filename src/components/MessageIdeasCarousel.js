import React, { useState, useEffect } from 'react';
import '../styles/MessageIdeasCarousel.css';

const messages = [
  "Happy birthday! I wish I could be there to celebrate with you.",
  "I'm so proud of everything you've accomplished.",
  "Remember that time we went fishing at the lake?",
  "Your grandpa's favorite bedtime story was...",
  "I love you to the moon and back.",
  "Here's our family's secret recipe for chocolate chip cookies...",
  "Remember to always follow your dreams, just like we talked about.",
  "Congratulations on your graduation! I knew you could do it.",
  "This was your grandmother's favorite lullaby..."
];

function MessageIdeasCarousel() {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrevIndex(index);
      setIndex((current) => (current + 1) % messages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [index]);

  return (
    <div className="message-ideas-carousel">
      <div className="carousel-track">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`carousel-item ${
              i === index ? 'active' : i === prevIndex ? 'previous' : ''
            }`}
          >
            {message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MessageIdeasCarousel; 