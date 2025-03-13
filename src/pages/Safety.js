import '../styles/Pages.css';

const Safety = () => {
  return (
    <div className="page-container">
      <h1>Safety Guidelines</h1>

      <section className="policy-section">
        <h2>Our Commitment to Safety</h2>
        <p>
          At Retain, we prioritize the safety and security of our users. Our voice cloning technology 
          is designed with built-in safeguards to prevent misuse and protect both creators and listeners.
        </p>
      </section>

      <section className="policy-section">
        <h2>Voice Protection</h2>
        <p>We protect your voice by:</p>
        <ul>
          <li>Only storing voice data after account creation</li>
          <li>Limiting each account to 4 voice models</li>
          <li>Providing instant deletion options for your voice models</li>
          <li>Never sharing your voice data with third parties</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Responsible Usage Guidelines</h2>
        <p>When using voice cloning, please:</p>
        <ul>
          <li>Only upload recordings of your own voice</li>
          <li>Obtain explicit permission if using another person's voice</li>
          <li>Be transparent about using AI-generated voices</li>
          <li>Respect copyright and intellectual property rights</li>
          <li>Consider the impact of your voice clone's usage on others</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Prohibited Uses</h2>
        <p>To maintain a safe environment, we strictly prohibit:</p>
        <ul>
          <li>Impersonation for fraudulent purposes</li>
          <li>Creation of misleading content</li>
          <li>Harassment or harm using voice clones</li>
          <li>Unauthorized use of others' voices</li>
          <li>Distribution of harmful or illegal content</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Account Security</h2>
        <p>Protect your account by:</p>
        <ul>
          <li>Using a strong, unique password</li>
          <li>Never sharing your login credentials</li>
          <li>Logging out from shared devices</li>
          <li>Regularly reviewing your voice models</li>
          <li>Reporting any suspicious activity immediately</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Reporting Concerns</h2>
        <p>
          If you encounter any safety issues or violations:
        </p>
        <ul>
          <li>Contact us immediately</li>
          <li>Document any concerning behavior</li>
          <li>Save relevant information or evidence</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Educational Resources</h2>
        <p>
          We provide resources to help you:
        </p>
        <ul>
          <li>Understand voice cloning technology</li>
          <li>Learn about AI safety best practices</li>
          <li>Identify potential misuse</li>
          <li>Stay informed about safety updates</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Contact Safety Team</h2>
        <p>
          For immediate safety concerns or to report violations, contact us at:
          <br />
          <a href="mailto:support@coventrylabs.net">support@coventrylabs.net</a>
        </p>
      </section>

      <footer className="policy-footer">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
};

export default Safety; 