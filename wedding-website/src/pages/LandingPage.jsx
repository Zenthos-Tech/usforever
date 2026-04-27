import { useEffect, useState } from "react";
import { StarIcon } from "../components/Icons";

import heroImage1 from "../assets/heroimage1.png";
import heroImage2 from "../assets/heroimage2.png";
import image3 from "../assets/image3.svg";
import image4 from "../assets/image4.svg";
import image5 from "../assets/image5.svg";
import image6 from "../assets/image6.svg";
import image7 from "../assets/image7.svg";

import heart from "../assets/heart.svg";
import checkIcon from "../assets/tick.svg";

import momentsIcon from "../assets/Moment.svg";
import storageIcon from "../assets/Storage.svg";
import albumIcon from "../assets/Album.svg";
import familyIcon from "../assets/family.svg";

import privateLinkIcon from "../assets/private-link.png";
import passwordIcon from "../assets/password-protection.png";
import downloadIcon from "../assets/download-control.png";

import smartTvIcon from "../assets/smart-tv.svg";
import slideshowIcon from "../assets/slideshow.svg";
import qualityIcon from "../assets/quality.svg";
import namesHeart from "../assets/namesheart.svg";

import qrIcon from "../assets/qr.svg";
import logo from "../assets/logo.svg";

import Colors from "../theme/colors";

const LandingPage = ({ setPage, onGetStartedClick, onLoginClick }) => {
  const words = ["Memories", "Love", "Story", "Journey", "Bond"];
  const [wordIndex, setWordIndex] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlashing(true);

      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setIsFlashing(false);
      }, 300);
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  const cssVars = {
    "--pink": Colors.primaryPink,
    "--disabledGrey": Colors.disabledGrey,
    "--textSecondary": Colors.textSecondary,
    "--border": Colors.border,
    "--bg": Colors.background,
    "--lightPink": "rgba(249, 106, 134, 0.10)",
    "--pillGrey": "rgba(167, 165, 165, 0.18)",
  };

  const openAuthFlow = () => {
    if (typeof onGetStartedClick === "function") onGetStartedClick();
    else if (typeof onLoginClick === "function") onLoginClick();
    else setPage?.("pricing");
  };

  return (
    <div className="lp-page" style={cssVars}>
      <style>{`
        .lp-page{
          width:100%;
          overflow-x:hidden;
        }

        .lp-fixed-qr {
          position: fixed;
          right: 0;
          bottom: 10vh;
          z-index: 999;
          width: 140px;
          padding: 18px 14px 14px;
          border-radius: 26px 0 0 26px;
          background: rgba(252, 252, 252, 0.62);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0px 4px 4px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .lp-fixed-qr-inner {
          position: relative;
          width: 92px;
          height: 92px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lp-fixed-qr-code {
          width: 92px;
          height: 92px;
          object-fit: contain;
        }

        .lp-fixed-qr-logoWrap {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: #fff;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .lp-fixed-qr-logo {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        .lp-fixed-qr-text {
          margin-top: 10px;
          font-size: 9px;
          font-weight: 500;
          color: #111;
          white-space: nowrap;
        }
.lp-container,
.lp-hero-inner,
.lp-memories-inner,
.family-section-inner,
.lp-plan-inner,
.bigscreen-inner,
.contact-section .lp-container,
.lp-section .lp-container,
.footer-inner{
  width: min(92vw, 1600px); /* 🔥 increased */
  margin: 0 auto;
}
        .lp-section,
        .lp-hero,
        .lp-memories,
        .family-section,
        .lp-plan,
        .bigscreen,
        .contact-section,
        .footer{
          width:100%;
        }

        .lp-section{
          padding: 80px 0;
        }

        .footer{
          width:100%;
        }

        .footer-inner{
          margin: 0 auto;
        }

        .bigscreen-inner{
          display:grid;
        }

        .lp-hero-wordWrap{
          display:inline-block;
          min-width:220px;
          position:relative;
        }

        .lp-hero-word{
          display:inline-flex;
          color:var(--pink);
          transition:opacity 0.12s ease;
        }

        .lp-hero-word.is-flashing{
          opacity:0;
        }

        .lp-hero-letter{
          display:inline-block;
          opacity:0;
          transform:translateX(-16px);
          animation:lpLetterIn 0.45s ease-out forwards;
        }

        @keyframes lpLetterIn {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* HOW IT WORKS */
        #how-it-works{
          padding: clamp(56px, 8vw, 110px) 0;
        }

        #how-it-works .lp-container{
          width: min(90vw, 1400px);
          margin: 0 auto;
        }

        #how-it-works .lp-section-title{
          margin: 0 0 10px;
          text-align: center;
          font-size: clamp(42px, 4vw, 58px);
          line-height: 1.05;
        }

        #how-it-works .lp-section-subtitle{
          margin: 0 auto clamp(36px, 5vw, 72px);
          max-width: 760px;
          text-align: center;
          font-size: clamp(14px, 1.5vw, 22px);
          line-height: 1.5;
          padding: 0 12px;
          font-weight: 500;
        }

        .lp-steps{
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(28px, 4vw, 72px);
          align-items: start;
          width: 100%;
        }

        .lp-step{
          text-align: center;
          padding: 0 clamp(6px, 1vw, 16px);
        }

        .lp-step-big{
          margin-bottom: clamp(18px, 2.5vw, 34px);
          font-size: clamp(84px, 10vw, 150px);
          line-height: 0.9;
          font-weight: 700;
          color: var(--pink);
        }

        .lp-step-title{
          margin: 0 0 clamp(10px, 1.4vw, 16px);
          font-size: clamp(18px, 1.5vw, 28px);
          line-height: 1.2;
          font-weight: 700;
          color: var(--pink);
        }

        .lp-step-desc{
          max-width: 360px;
          margin: 0 auto;
          font-size: clamp(14px, 0.9vw, 15px);
          line-height: 1.65;
          color: var(--textSecondary);
        }

        /* FAMILY */
        .family-media{
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .family-img{
          width: 100%;
          max-width: 100%;
          border-radius: 28px;
          display: block;
          object-fit: cover;
        }

        .family-stat{
          position: absolute;
          right: 5%;
          bottom: 6%;
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 16px 18px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        /* COMMON */
        .lp-feature-cards,
        .privacy-grid,
        .testimonials-grid{
          width: 100%;
        }

.testimonials-grid{
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* equal full stretch */
  gap: 32px;
}
.testimonial-card{
  width: 100%;
  max-width: none;   /* ✅ allow full stretch */
}
        .testimonial-text {
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .testimonial-name {
          font-size: clamp(16px, 1.4vw, 20px);
          font-weight: 700;
        }

        /* CONTACT */
        .contact-container{
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(20px, 3vw, 48px);
          align-items: stretch;
        }

        .contact-form{
          width: 100%;
          padding: clamp(24px, 3vw, 40px);
          border-radius: 20px;
          box-sizing: border-box;
        }

        .contact-img{
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }

        .form-row{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-input,
        .form-textarea{
          width: 100%;
          box-sizing: border-box;
        }

        /* BIG SCREEN SECTION */
        .bigscreen{
          width: 100%;
          padding: 70px 0;
        }

        .bigscreen-inner{
          width: min(90vw, 1150px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: clamp(28px, 4vw, 52px);
          align-items: center;
          box-sizing: border-box;
        }

        .bigscreen-img{
          width: 100%;
          max-width: 720px;
          justify-self: start;
          display: block;
          object-fit: cover;
          border-radius: 28px;
        }

        .bigscreen-content{
          width: 100%;
          max-width: 470px;
          padding: 0;
          box-sizing: border-box;
        }

        .bigscreen-title{
          margin: 0 0 18px;
          font-size: clamp(38px, 4.2vw, 64px);
          line-height: 1.02;
          font-weight: 700;
          color: #171717;
          white-space: nowrap;
        }

        .bigscreen-title span{
          color: var(--pink);
        }

        .bigscreen-desc{
          margin: 0 0 24px;
          max-width: 430px;
          font-size: clamp(15px, 1.05vw, 18px);
          line-height: 1.45;
          color: var(--textSecondary);
        }

        .bigscreen-features{
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 26px;
        }

        .bigscreen-feature{
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .bigscreen-feature .feature-icon{
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          margin-top: 3px;
        }

        .bigscreen-feature h3{
          margin: 0;
          font-size: clamp(15px, 0.95vw, 18px);
          line-height: 1.35;
          font-weight: 500;
          color: #171717;
        }

        /* TABLETS */
        @media (max-width: 1024px){
          .lp-container,
          .lp-hero-inner,
          .lp-memories-inner,
          .family-section-inner,
          .lp-plan-inner,
          .contact-section .lp-container,
          .lp-section .lp-container,
          .bigscreen-inner,
          .footer-inner{
            width: 90vw;
          }

          .lp-steps{
            gap: clamp(24px, 3vw, 40px);
          }

          .lp-step-big{
            font-size: clamp(72px, 9vw, 120px);
          }

          .lp-step-title{
            font-size: clamp(18px, 2.2vw, 26px);
          }

          .lp-step-desc{
            font-size: clamp(13px, 1.5vw, 16px);
          }

          .bigscreen-inner{
            width: min(90vw, 980px);
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }

          .bigscreen-img{
            max-width: 100%;
          }

          .bigscreen-title{
            font-size: clamp(34px, 4vw, 52px);
          }
            .lp-container,
.lp-hero-inner,
.lp-memories-inner,
.family-section-inner,
.lp-plan-inner,
.bigscreen-inner,
.contact-section .lp-container,
.lp-section .lp-container,
.footer-inner{
  width: min(90vw, 1400px);
  margin: 0 auto;
  box-sizing: border-box;
}
  .family-img,
.contact-img,
.lp-feature-cards,
.privacy-grid,
.testimonials-grid,
.contact-container{
  width: 100%;
}
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .lp-fixed-qr {
            display: none;
          }

          .lp-container,
          .lp-hero-inner,
          .lp-memories-inner,
          .family-section-inner,
          .lp-plan-inner,
          .contact-section .lp-container,
          .lp-section .lp-container,
          .bigscreen-inner,
          .footer-inner{
            width: 92vw;
          }

          #how-it-works .lp-container{
            width: 92vw;
          }

          .lp-steps{
            grid-template-columns: 1fr;
            gap: 42px;
          }

          .lp-step{
            max-width: 520px;
            margin: 0 auto;
          }

          .lp-step-big{
            font-size: clamp(72px, 20vw, 110px);
            margin-bottom: 16px;
          }

          .lp-step-title{
            font-size: clamp(20px, 5.5vw, 28px);
          }

          .lp-step-desc{
            font-size: 15px;
            max-width: 100%;
          }

          .bigscreen{
            padding: 56px 0;
          }

          .bigscreen-inner{
            width: 92vw;
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .bigscreen-img{
            max-width: 100%;
            justify-self: center;
          }

          .bigscreen-content{
            max-width: 100%;
          }

          .bigscreen-title{
            white-space: normal;
            font-size: 36px;
          }

          .bigscreen-desc{
            max-width: 100%;
            font-size: 15px;
          }

          .contact-container{
            grid-template-columns: 1fr;
          }

          .contact-img{
            height: 320px;
          }

          .form-row{
            grid-template-columns: 1fr;
          }

          .testimonials-grid{
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px){
          #how-it-works{
            padding: 48px 0;
          }

          #how-it-works .lp-section-title{
            font-size: 32px;
          }

          #how-it-works .lp-section-subtitle{
            font-size: 14px;
            margin-bottom: 28px;
          }

          .lp-step-big{
            font-size: 64px;
          }

          .lp-step-title{
            font-size: 19px;
          }

          .lp-step-desc{
            font-size: 14px;
            line-height: 1.6;
          }
        }
      `}</style>

      {/* FIXED QR BOX */}
      <div className="lp-fixed-qr" aria-label="Download app QR">
        <div className="lp-fixed-qr-inner">
          <img src={qrIcon} alt="QR code" className="lp-fixed-qr-code" />
          <div className="lp-fixed-qr-logoWrap">
            <img src={logo} alt="Us Forever" className="lp-fixed-qr-logo" />
          </div>
        </div>
        <div className="lp-fixed-qr-text">Download The UsForever App</div>
      </div>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-left">
            <div className="lp-hero-left-content">
              <h1 className="lp-hero-title">
                Your <br />
                <span className="lp-hero-wordWrap" aria-live="polite">
                  <span className={`lp-hero-word ${isFlashing ? "is-flashing" : ""}`} key={wordIndex}>
                    {words[wordIndex].split("").map((char, i) => (
                      <span
                        key={`${wordIndex}-${i}-${char}`}
                        className="lp-hero-letter"
                        style={{ animationDelay: `${i * 0.06}s` }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    ))}
                  </span>
                </span>
                <br />
                Should <br />
                Last <br />
                <span className="lp-hero-forever">Forever.</span>
              </h1>

              <div className="lp-hero-features lp-hero-features--oneLine">
                <div className="lp-hero-feature">
                  <img src={checkIcon} className="lp-check" alt="" />
                  <span>Private &amp; Secure</span>
                </div>
                <div className="lp-hero-feature">
                  <img src={checkIcon} className="lp-check" alt="" />
                  <span>Face-Based Discovery</span>
                </div>
                <div className="lp-hero-feature">
                  <img src={checkIcon} className="lp-check" alt="" />
                  <span>TV Viewing Experience</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-collage">
              <div className="lp-hero-photo lp-photo-left">
                <img src={heroImage2} alt="Wedding ceremony" />
              </div>

              <div className="lp-hero-photo lp-photo-right">
                <img src={heroImage1} alt="Wedding celebration" />
                <img className="lp-heart lp-heart-top-1" src={heart} alt="" />
                <img className="lp-heart lp-heart-top-2" src={heart} alt="" />
              </div>

              <img className="lp-heart lp-heart-bottom-1" src={heart} alt="" />
              <img className="lp-heart lp-heart-bottom-2" src={heart} alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section" id="how-it-works">
        <div className="lp-container">
          <h2 className="lp-section-title">How It Works</h2>
          <p className="lp-section-subtitle">
            Three simple steps to preserve your wedding memories forever
          </p>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-big">01</div>
              <h3 className="lp-step-title">Create Your Album</h3>
              <p className="lp-step-desc">
                Set up your wedding space in seconds. Choose your date, add your details,
                and you&apos;re ready to go.
              </p>
            </div>

            <div className="lp-step">
              <div className="lp-step-big">02</div>
              <h3 className="lp-step-title">Invite Your Photographer</h3>
              <p className="lp-step-desc">
                Share a secure upload link with your photographer. They upload directly to
                your private album.
              </p>
            </div>

            <div className="lp-step">
              <div className="lp-step-big">03</div>
              <h3 className="lp-step-title">Relive Your Story</h3>
              <p className="lp-step-desc">
                View, select, and share moments with family. Find yourself in every photo
                instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MEMORIES */}
      <section className="lp-memories">
        <div className="lp-container lp-memories-inner">
          <h2 className="lp-section-title">See Your Memories Come to Life</h2>
          <p className="lp-section-subtitle">
            Organize, discover, and relive every precious moment
          </p>

          <div className="lp-memories-grid">
            <div className="lp-memory-card">
              <img className="lp-memory-img" src={image3} alt="Wedding moment" />
            </div>

            <div className="lp-memory-card">
              <img className="lp-memory-img" src={image4} alt="Wedding couple" />
            </div>
          </div>

          <div className="lp-feature-cards">
            <div className="lp-feature-card">
              <div className="lp-feature-ico">
                <img src={momentsIcon} alt="Moments" />
              </div>
              <h3>Moments You&apos;re In</h3>
              <p>Find every photo with your face instantly</p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-ico">
                <img src={storageIcon} alt="Storage" />
              </div>
              <h3>300GB Storage</h3>
              <p>Secure cloud storage for all your memories</p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-ico">
                <img src={albumIcon} alt="Album" />
              </div>
              <h3>Album Picks</h3>
              <p>Select Favorites for your Album</p>
            </div>
          </div>

          <div className="lp-center">
            <button className="lp-cta" onClick={openAuthFlow}>
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Family */}
      <section className="family-section">
        <div className="lp-container family-section-inner">
          <div className="family-media">
            <img className="family-img" src={image5} alt="Wedding family" />

            <div className="family-stat">
              <img src={familyIcon} alt="Families" className="family-icon" />
              <div className="family-stat-number">500+</div>
              <div className="family-stat-label">Families Connected</div>
            </div>
          </div>

          <div className="share-row">
            <div>
              <h2 className="share-title">
                Share Your Joy
                <br />
                Without the Chaos
              </h2>
            </div>
            <p className="share-desc">
              Send one private link. Control who sees what. Let your family relive the magic
              without endless group chats or scattered files.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy cards */}
      <section className="lp-section" style={{ paddingTop: 20 }}>
        <div className="lp-container">
          <div className="privacy-grid">
            <div className="privacy-card">
              <img src={privateLinkIcon} alt="Private Link" className="feature-icon" />
              <h3>One Private Link</h3>
              <p>Share your entire album with a single secure link</p>
            </div>
            <div className="privacy-card">
              <img src={passwordIcon} alt="Passcode" className="feature-icon" />
              <h3>Passcode Protection</h3>
              <p>Keep your memories private and secure</p>
            </div>
            <div className="privacy-card">
              <img src={downloadIcon} alt="Download" className="feature-icon" />
              <h3>Download Control</h3>
              <p>Choose who can save and download photos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Big Screen */}
      <section className="bigscreen">
        <div className="bigscreen-inner">
          <img className="bigscreen-img" src={image6} alt="Wedding couple" />

          <div className="bigscreen-content">
            <h2 className="bigscreen-title">
              See Your Wedding
              <br />
              <span>On the Big Screen</span>
            </h2>
            <p className="bigscreen-desc">
              Relive your special day in stunning detail. Cast to your TV and watch your wedding
              unfold like a movie.
            </p>

            <div className="bigscreen-features">
              <div className="bigscreen-feature">
                <img src={smartTvIcon} alt="Smart TV" className="feature-icon" />
                <h3>Cast to any Smart TV or device</h3>
              </div>
              <div className="bigscreen-feature">
                <img src={slideshowIcon} alt="Slideshow" className="feature-icon" />
                <h3>Beautiful slideshow mode</h3>
              </div>
              <div className="bigscreen-feature">
                <img src={qualityIcon} alt="Quality" className="feature-icon" />
                <h3>4K quality support</h3>
              </div>
            </div>

            <button className="lp-cta" onClick={openAuthFlow}>
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* PLAN */}
      <section className="lp-plan" id="pricing">
        <div className="lp-container lp-plan-inner">
          <h2 className="lp-plan-title">Forever Album Plan</h2>
          <p className="lp-plan-subtitle">
            Everything you need to preserve your wedding memories
          </p>

          <div className="lp-plan-stage">
            <div className="lp-plan-card">
              <div className="lp-plan-top">
                <div className="lp-plan-top-small">Premium Plan</div>
                <div className="lp-plan-priceRow">
                  <div className="lp-plan-price">$49.99</div>
                  <div className="lp-plan-per">per year</div>
                </div>
                <div className="lp-plan-top-line">Find every photo with your face instantly</div>
              </div>

              <div className="lp-plan-body">
                {[
                  "300GB secure cloud storage",
                  "AI-powered facial discovery",
                  "TV viewing & casting",
                  "Unlimited family sharing",
                  "Long-term preservation guarantee",
                  "Priority support",
                ].map((t, i) => (
                  <div className="lp-plan-item" key={i}>
                    <img src={checkIcon} className="lp-plan-tick" alt="" />
                    <span>{t}</span>
                  </div>
                ))}

                <button className="lp-plan-btn" onClick={openAuthFlow}>
                  Unlock Your Forever
                </button>

                <div className="lp-plan-foot">
                  14-day money-back guarantee • Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-section">
        <div className="lp-container">
          <h2 className="lp-section-title">Love Stories from Real Couples</h2>
          <p className="lp-section-subtitle">&nbsp;</p>

          <div className="testimonials-grid">
            {[
              {
                text: "We can relive our wedding day anytime we want. Finding all the photos we're in was magical. Our parents love casting it to their TV!",
                author: "Priya & Rahul",
                meta: "Forever Plan · Married Oct 2024",
              },
              {
                text: "We can relive our wedding day anytime we want. Finding all the photos we're in was magical. Our parents love casting it to their TV! ",
                author: "Sarah & James",
                meta: "Forever Plan · Married Sep 2024",
              },
              {
                text: "We can relive our wedding day anytime we want. Finding all the photos we're in was magical. Our parents love casting it to their TV!",
                author: "Anika & Dev",
                meta: "Forever Plan · Married Nov 2024",
              },
            ].map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, j) => (
                    <StarIcon key={j} />
                  ))}
                </div>

                <p className="testimonial-text">"{t.text}"</p>

                <div className="testimonial-authorRow">
                  <img src={namesHeart} className="testimonial-nameHeart" alt="" />
                  <div>
                    <div className="testimonial-author">{t.author}</div>
                    <div className="testimonial-meta">{t.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="contact-section" id="contact">
        <div className="lp-container">
          <h2 className="section-title">Get in Touch</h2>
          <p className="section-subtitle">
            We&apos;re here to help preserve your precious memories
          </p>

          <div className="contact-container">
            <div className="contact-form">
              <h3>Send Us a Message</h3>

              <div className="form-row">
                <input className="form-input" placeholder="First Name" />
                <input className="form-input" placeholder="Last Name" />
              </div>

              <input className="form-input full" placeholder="Email" />
              <input className="form-input full" placeholder="Phone Number" />
              <textarea className="form-textarea" placeholder="Message" />
              <button className="submit-btn">Submit</button>
            </div>

            <img className="contact-img" src={image7} alt="Bride" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;