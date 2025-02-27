import { Link } from 'react-router-dom';
import '../styles/Footer.css';
import logo from '../assets/logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <Link to="/" className="footer-logo">
          <img src={logo} alt="Retain" />
        </Link>
        <span className="separator">•</span>
        <div className="footer-links">
          <Link to="/privacy">Privacy</Link>
          <span className="separator">•</span>
          <Link to="/terms">Terms</Link>
          <span className="separator">•</span>
          <Link to="/safety">Safety</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 