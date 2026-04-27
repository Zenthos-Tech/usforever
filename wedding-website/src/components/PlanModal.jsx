import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Colors from "../theme/colors";
import Footer from "./Footer";

import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";
import closeIcon from "../assets/Moment.svg";

// ✅ step icons
import step1 from "../assets/plan.svg";
import step2 from "../assets/checkout.svg";
import step3 from "../assets/uploading.svg";

import securityIcon from "../assets/security.svg";
import couplesIcon from "../assets/couples.svg";
import guaranteeIcon from "../assets/heart2.svg";
import backIcon from "../assets/arrow.svg";
import heartIcon from "../assets/hearts.svg";
import tickIcon from "../assets/tick.svg";

const PlanModal = ({ open, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  const cssVars = useMemo(
    () => ({
      "--pink": Colors.primaryPink,
      "--pink-footer": "#F96A86",
    }),
    []
  );

  if (!open) return null;

  const bullets = [
    "300GB secure cloud storage",
    "AI-powered facial discovery",
    "TV viewing & casting",
    "Unlimited family sharing",
    "Long-term preservation guarantee",
    "Priority support",
  ];

  const faqs = [
    {
      q: "Can I upgrade or downgrade later?",
      a: "Absolutely! You can change your plan anytime. When upgrading, you’ll only pay the prorated difference.",
    },
    {
      q: "What happens if I cancel?",
      a: "You’ll have access until the end of your billing period. You can download all your photos before your subscription ends.",
    },
    {
      q: "Is the Eternal plan really lifetime?",
      a: "Yes! One payment, lifetime access. Your memories will be preserved as long as UsForever exists, with guaranteed storage for life.",
    },
    {
      q: "Can multiple people access the account?",
      a: "Yes! All plans support sharing. The couple can both access and manage the account, and you can share albums with family and friends.",
    },
  ];

  const handleUnlock = () => {
    onClose?.();
    navigate("/forever");
  };

  return (
    <div className="plan-modal-overlay" style={cssVars} onClick={onClose}>
      <div className="plan-modal-card" onClick={(e) => e.stopPropagation()}>
      
          {/* ✅ top bar now scrolls with content */}
          <div className="plan-modal-topbar">
            <div className="plan-modal-brand">
              <img className="plan-modal-brand-ico" src={logo} alt="Logo" />
              <img
                className="plan-modal-brand-title"
                src={logoTitle}
                alt="us forever"
              />
            </div>

            <button
              className="plan-modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="plan-modal-wrap">
            <section className="plan-section">
              <h1 className="plan-h1">Forever Album Plan</h1>
              <p className="plan-sub">
                Everything you need to preserve your wedding memories
              </p>

              <div className="plan-steps-card">
                <div className="plan-steps-title">Simple 3–Step Process</div>

                <div className="plan-steps-row">
                  <div className="plan-step">
                    <img className="plan-step-ico" src={step1} alt="01" />
                    <div className="plan-step-name">Choose Your Plan</div>
                    <div className="plan-step-desc">
                      Select the perfect plan for your needs
                    </div>
                  </div>

                <div className="plan-step-arrow">
  <img src={backIcon} alt="step" />
</div>

                  <div className="plan-step">
                    <img className="plan-step-ico" src={step2} alt="02" />
                    <div className="plan-step-name">Secure Checkout</div>
                    <div className="plan-step-desc">
                      Enter payment details safely
                    </div>
                  </div>

                          <div className="plan-step-arrow">
  <img src={backIcon} alt="step" />
</div>

                  <div className="plan-step">
                    <img className="plan-step-ico" src={step3} alt="03" />
                    <div className="plan-step-name">Start Uploading</div>
                    <div className="plan-step-desc">
                      Begin preserving your memories
                    </div>
                  </div>
                </div>
              </div>

           <div className="plan-price-card">
  <div className="plan-price-top">

    <div className="plan-plan-label">Premium Plan</div>

    <div className="plan-price-row">
      <div className="plan-price">$49.99</div>
      <span className="plan-price-per">per year</span>
    </div>

    <div className="plan-price-caption">
      Find every photo with your face instantly
    </div>

  </div>

                <div className="plan-price-body">
                  {bullets.map((t, i) => (
                    <div className="plan-bullet" key={i}>
                      <img
                        className="plan-bullet-tickIcon"
                        src={tickIcon}
                        alt=""
                      />
                      <span>{t}</span>
                    </div>
                  ))}

                  <button
                    className="plan-unlock-btn"
                    type="button"
                    onClick={handleUnlock}
                  >
                    Unlock Your Forever
                  </button>

                  <div className="plan-footnote">
                    14-day money-back guarantee • Cancel anytime
                  </div>
                </div>
              </div>
            </section>

            <section className="trust-section">
              <div className="trust-row">
                <div className="trust-card">
                  <img className="trust-ico" src={securityIcon} alt="" />
                  <div className="trust-title">Bank-Level Security</div>
                  <div className="trust-desc">
                    Your memories are encrypted and protected
                  </div>
                </div>

                <div className="trust-card">
                  <img className="trust-ico" src={couplesIcon} alt="" />
                  <div className="trust-title">50,000+ Happy Couples</div>
                  <div className="trust-desc">
                    Join thousands preserving their memories
                  </div>
                </div>

                <div className="trust-card">
                  <img className="trust-ico" src={guaranteeIcon} alt="" />
                  <div className="trust-title">30-Day Guarantee</div>
                  <div className="trust-desc">
                    Not in love? Get your money back
                  </div>
                </div>
              </div>
            </section>

            <section className="faq-section">
              <h2 className="faq-h2">Questions About Your Forever Plan?</h2>

              <div className="faq-list">
                {faqs.map((item, idx) => (
                  <div className="faq-item" key={idx}>
                    <div className="faq-q">{item.q}</div>
                    <div className="faq-a">{item.a}</div>
                  </div>
                ))}

                <div className="faq-bottom">
                  Still have questions?{" "}
                  <span className="faq-link">Chat with our team</span>
                </div>
              </div>
            </section>

            <section className="plan-quote">
              <img className="plan-quote-heart" src={heartIcon} alt="" />
              <div className="plan-quote-text">
                “UsForever gave us the perfect place to preserve your wedding
                memories. The face recognition found photos we didn’t even
                notice existed. It’s more than storage — it’s an entire story,
                beautifully organized.”
              </div>
              <div className="plan-quote-author">Priya & Aditya</div>
              <div className="plan-quote-meta">
                Forever Plan • Married Nov 2024
              </div>
            </section>
          </div>

          <div className="plan-modal-footerWrap">
            <Footer />
        
        </div>
      </div>

      <style>{`
        .plan-modal-overlay{
          position:fixed;
          inset:0;
          width:100vw;
          height:100vh;
          display:flex;
          align-items:stretch;
          justify-content:stretch;
          padding:0;
          overflow:hidden;
          z-index:9999;
        }

      .plan-modal-card{
  width:100vw;
  max-width:100vw;
  height:100vh;
  max-height:100vh;
  overflow-y:auto;
  overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
}

     

        /* ✅ top bar scrolls with content now */
        .plan-modal-topbar{
          width:90vw;
          max-width:1600px;
          margin:0 auto;
          padding-top:20px;
          padding-bottom:8px;
          padding-left:0;
          padding-right:0;
          display:flex;
          align-items:center;
          justify-content:space-between;
        }

        .plan-modal-brand{
          display:flex;
          align-items:center;
          gap:12px;
        }

     
        .plan-modal-brand-title{
          display:block;
        }

       .plan-modal-brand-ico{
  transform:translateY(0px);
}

.plan-modal-close{
  background:transparent;
  border:none;
  padding:0;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transform:translateY(2px);
}
  .plan-step-arrow img{
  width:40px;
  height:40px;

  /* tint color */
  filter: brightness(0) saturate(100%) invert(68%) sepia(6%) saturate(493%) hue-rotate(180deg) brightness(90%) contrast(90%);
}
        .plan-modal-close img{
          display:block;
        }

        .plan-modal-wrap{
          width:90vw;
          max-width:1600px;
          margin:0 auto;
          padding-left:0;
          padding-right:0;
        }

        .plan-section,
        .trust-section,
        .faq-section,
        .plan-quote,
        .plan-price-card,
        .plan-steps-card,
        .faq-list,
        .trust-row{
          width:100%;
          max-width:100%;
          box-sizing:border-box;
        }

        .plan-bullet{
          display:flex;
          align-items:center;
          gap:10px;
        }

        .plan-steps-card{
          padding-top:48px;
          padding-bottom:48px;
          min-height:300px;
          width:100%;
          max-width:100%;
          margin-left:auto;
          margin-right:auto;
        }
.plan-modal-topbar{
  position:static !important;
  top:auto !important;
}
        .trust-card{
          min-height:200px;
        }

        .faq-section{
          background: linear-gradient(135deg, #FFF1F2 0%, #FFF7ED 100%);
          border-top: 1.44px solid #FFE4E6;
        }

        .faq-link{
          font-weight:1200;
        }

        .plan-quote-heart{
          width:72px;
          height:72px;
          object-fit:contain;
          margin-bottom:18px;
        }

        .plan-quote-text{
          max-width:580px;
          margin:0 auto;
          text-align:center;
          line-height:1.6;
        }

        .plan-bullet-tickIcon{
          width:18px;
          height:18px;
          object-fit:contain;
          flex:0 0 auto;
        }

        img{
          max-width:100%;
          height:auto;
        }
.plan-modal-footerWrap{
  width:100%;
  margin-top:48px;
  flex-shrink:0;
}.plan-section{
  width:100%;
  max-width:100%;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  align-items:center;
}

.plan-h1,
.plan-sub,
.plan-steps-card{
  width:100%;
}

.plan-price-card{
  width:100%;
  max-width:520px;
  margin:32px auto 0;
}
  .plan-plan-label{
  font-size:14px;
  color:rgba(255,255,255,0.8);
  margin-bottom:6px;
  text-align:center;
}

.plan-price-row{
  display:flex;
  align-items:flex-end;
  justify-content:center;
  gap:6px;
}

.plan-price{
  font-size:42px;
  font-weight:800;
  color:#fff;
  line-height:1;
}

.plan-price-per{
  font-size:14px;
  color:rgba(255,255,255,0.85);
  margin-bottom:6px;
}

.plan-price-caption{
  margin-top:10px;
  font-size:16px;
  color:#fff;
  text-align:center;
}
        @media (max-width: 1024px){
          .plan-modal-topbar,
          .plan-modal-wrap{
            width:90vw;
          }

          .plan-steps-row,
          .trust-row{
            width:100%;
          }
        }

        @media (max-width: 768px){
          .plan-modal-topbar,
          .plan-modal-wrap,
          .plan-section,
          .trust-section,
          .faq-section,
          .plan-quote,
          .plan-price-card,
          .plan-steps-card,
          .faq-list,
          .trust-row{
            width:90vw;
            max-width:90vw;
            margin-left:auto;
            margin-right:auto;
          }

          .plan-steps-row{
            display:flex;
            flex-direction:column;
            align-items:stretch;
            width:100%;
          }

          .plan-step-arrow{
            align-self:center;
            transform:rotate(90deg);
          }

          .trust-row{
            display:flex;
            flex-direction:column;
          }

          .plan-modal-brand-ico,
          .plan-modal-close{
            transform:translateY(4px);
          }
            .plan-modal-topbar{
  position: relative !important;
  top: auto !important;
}
  .plan-modal-card{
  overflow: auto;
}
        }

        @media (max-width: 480px){
          .plan-modal-topbar,
          .plan-modal-wrap,
          .plan-section,
          .trust-section,
          .faq-section,
          .plan-quote,
          .plan-price-card,
          .plan-steps-card,
          .faq-list,
          .trust-row{
            width:90vw;
            max-width:90vw;
          }

          .plan-modal-brand{
            min-width:0;
          }

          .plan-modal-brand-title{
            max-width:100%;
          }

          .plan-bullet{
            align-items:flex-start;
          }

          .plan-modal-brand-ico,
          .plan-modal-close{
            transform:translateY(4px);
          }
        }
      `}</style>
    </div>
  );
};

export default PlanModal;