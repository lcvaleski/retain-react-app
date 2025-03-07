import React from 'react';

function StripeTest() {
  const handleClick = async () => {
    try {
      const response = await fetch('/api/stripe-test', {
        method: 'POST',
      });
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <button onClick={handleClick}>
      Buy 4 Voice Pack ($5)
    </button>
  );
}

export default StripeTest; 