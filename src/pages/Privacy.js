import '../styles/Pages.css';

const Privacy = () => {
  return (
    <div className="page-container">
      <h1>Privacy Policy</h1>
      
      <section className="policy-section">
        <h2>Voice Data Collection</h2>
        <p>
          When you use our voice sampling feature before creating an account, please note:
        </p>
        <ul>
          <li>Voice samples are temporarily processed but not permanently stored</li>
          <li>Permanent storage of voice data only occurs after you voluntarily create an account</li>
          <li>You maintain full control over your voice data and can delete it at any time</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Information We Collect</h2>
        <p>
          We collect information that you provide directly to us, including:
        </p>
        <ul>
          <li>Account information (email address)</li>
          <li>Voice recordings you choose to save</li>
          <li>Generated voice models associated with your account</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>How We Use Your Information</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Create and manage your account</li>
          <li>Process and store your voice models</li>
          <li>Respond to your comments and questions</li>
          <li>Send you related information, including confirmations, updates, and security alerts</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information:
        </p>
        <ul>
          <li>All data is encrypted in transit and at rest</li>
          <li>Access to personal data is strictly controlled</li>
          <li>Regular security assessments are performed</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data</li>
          <li>Opt out of marketing communications</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
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

export default Privacy; 