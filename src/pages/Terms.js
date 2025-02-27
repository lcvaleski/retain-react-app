import '../styles/Pages.css';

const Terms = () => {
  return (
    <div className="page-container">
      <h1>Terms of Service</h1>

      <section className="policy-section">
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing and using Retain's voice cloning services, you agree to be bound by these Terms of Service. 
          If you disagree with any part of these terms, you may not access our service.
        </p>
      </section>

      <section className="policy-section">
        <h2>Account Terms</h2>
        <ul>
          <li>You must be 13 years or older to use this service</li>
          <li>You must provide a valid email address for account registration</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You are responsible for all activities that occur under your account</li>
          <li>You must notify us immediately of any unauthorized use of your account</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Voice Cloning Usage</h2>
        <ul>
          <li>You may only upload voice recordings of yourself or those you have explicit permission to use</li>
          <li>You maintain ownership of your original voice recordings</li>
          <li>You agree not to use the service for impersonation or fraudulent purposes</li>
          <li>You are limited to 4 voice models at any given time</li>
          <li>We reserve the right to remove voice models that violate our terms</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Acceptable Use</h2>
        <p>You agree not to use the service to:</p>
        <ul>
          <li>Violate any laws or regulations</li>
          <li>Infringe upon intellectual property rights</li>
          <li>Harass, abuse, or harm others</li>
          <li>Spread misinformation or engage in fraudulent activities</li>
          <li>Attempt to gain unauthorized access to any part of the service</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Service Modifications</h2>
        <p>
          We reserve the right to:
        </p>
        <ul>
          <li>Modify or terminate the service for any reason</li>
          <li>Change the terms of service with reasonable notice</li>
          <li>Refuse service to anyone for any reason</li>
          <li>Limit the number of voice models per user</li>
          <li>Update pricing and features at any time</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Limitation of Liability</h2>
        <p>
          Retain is provided "as is" without warranty of any kind. We are not responsible for:
        </p>
        <ul>
          <li>Any loss of data or voice models</li>
          <li>Service interruptions or downtime</li>
          <li>Misuse of generated voice content by users</li>
          <li>Third-party actions or content</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Termination</h2>
        <p>
          We may terminate or suspend your account if you violate these terms. Upon termination:
        </p>
        <ul>
          <li>Your access to the service will be removed</li>
          <li>Your voice models will be deleted</li>
          <li>You may request a copy of your data within 30 days</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Contact</h2>
        <p>
          For questions about these Terms of Service, please contact:
          <br />
          <a href="mailto:terms@retain.ai">terms@retain.ai</a>
        </p>
      </section>

      <footer className="policy-footer">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
};

export default Terms; 