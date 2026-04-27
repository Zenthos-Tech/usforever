import React from "react";

import bottomLogo from "../assets/bottomlogo.svg";

import twitterIcon from "../assets/twitter.svg";
import linkedinIcon from "../assets/linkedin.png";
import facebookIcon from "../assets/facebook.svg";
import instaIcon from "../assets/insta.png";

import englishIcon from "../assets/english.svg";

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-top">
        {/* LEFT BRAND */}
        <div className="footer-brandCol">
          <div className="footer-brandRow">
            <img className="footer-brandLogo" src={bottomLogo} alt="us forever" />
            <span className="footer-brandText">us forever</span>
          </div>

          <p className="footer-tagline">
            Trust speaks. Respect follows.
            <br />
            Influence becomes impact.
          </p>

          <div className="footer-socials">
            <a className="footer-social" href="#" aria-label="X">
              <img src={twitterIcon} alt="" />
            </a>
            <a className="footer-social" href="#" aria-label="LinkedIn">
              <img src={linkedinIcon} alt="" />
            </a>
            <a className="footer-social" href="#" aria-label="Facebook">
              <img src={facebookIcon} alt="" />
            </a>
            <a className="footer-social" href="#" aria-label="Instagram">
              <img src={instaIcon} alt="" />
            </a>
          </div>

          <div className="footer-language">
            <img src={englishIcon} alt="" className="footer-langIcon" />
            <span>English</span>
          </div>
        </div>

        {/* COL 1 */}
        <div className="footer-col">
          <h4>Important Links</h4>
          <a href="#">Home</a>
          <a href="#">How It Works</a>
          <a href="#">Pricing</a>
          <a href="#">Contact Us</a>
        </div>

        {/* COL 2 */}
        <div className="footer-col">
          <h4>Legals</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms &amp; Conditions</a>
        </div>

        {/* COL 3 */}
        <div className="footer-col">
          <h4>Contact Us</h4>
          <a href="#">Work With Us</a>
          <a href="mailto:contact@usforever.com">contact@usforever.com</a>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-bottom">
        <span className="footer-copy">
          © Copyright 2026 IndexNation. All Rights Reserved.
        </span>

        <div className="footer-legalLinks">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Whistleblower Policy</a>
          <a href="#">Cookie policy</a>
          <a href="#">Cookie Settings</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;