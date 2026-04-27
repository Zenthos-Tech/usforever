import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Colors from "../theme/colors";
import Footer from "../components/Footer";

import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";
import closeIcon from "../assets/Moment.svg";

import downloadPlayStore from "../assets/play.svg";
import downloadAppStore from "../assets/apple.svg";
import qrCode from "../assets/qr.svg";

import securityIcon from "../assets/security.svg";
import couplesIcon from "../assets/couples.svg";
import guaranteeIcon from "../assets/heart2.svg";
import heartIcon from "../assets/hearts.svg";

export default function ForeverScreen() {
  const navigate = useNavigate();

  const cssVars = useMemo(
    () => ({
      "--pink": Colors.primaryPink,
      "--pink-footer": "#F96A86",
      "--text": "#1A1A1A",
      "--muted": "rgba(26,26,26,0.58)",
      "--soft-pink": "#FBF0F3",
      "--card": "rgba(255,255,255,0.98)",
      "--line": "rgba(0,0,0,0.06)",
      "--shadow": "0 16px 40px rgba(0,0,0,0.06)",
    }),
    []
  );

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

  return (
    <div className="forever-page" style={cssVars}>
      <style>{`
        *{
          box-sizing:border-box;
        }

        .forever-page{
          min-height:100vh;
          width:100%;
          background:#fff;
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
        }

  .forever-brand{
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
        }

        .forever-brand-ico{
          width:44px;
          height:44px;
          object-fit:contain;
          flex:0 0 auto;
        }

        .forever-brand-title{
          height:28px;
          width:auto;
          object-fit:contain;
          display:block;
        }

        .forever-close{
          border:none;
          background:transparent;
          cursor:pointer;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
        }

     .forever-close img{
  width:clamp(36px, 3vw, 48px);
  height:clamp(36px, 3vw, 48px);
  object-fit:contain;
  display:block;
}



.
  .plan-modal-card{
  width:100vw;
  max-width:100vw;
  height:100vh;
  max-height:100vh;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}.forever-title{
  margin:0;
  max-width:900px;
  font-size:56px;
  line-height:1.02;
  font-weight:800;
  letter-spacing:-0.04em;
  color:#2B2529;
  text-align:center;
}

.forever-sub{
  margin-top:12px;
  max-width:760px;
  font-size:23px;
  line-height:1.35;
  font-weight:400;
  color:rgba(43,37,41,0.62);
  text-align:center;
}

        .forever-badges{
          margin-top:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:16px;
          flex-wrap:wrap;
        }

.store-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  background:#111;
  color:#fff;
  border:none;
  border-radius:999px;

  padding:16px 34px;
  min-width:200px;

  cursor:pointer;
  box-shadow:0 8px 20px rgba(0,0,0,0.2);
}

        .store-icon{
          width:25px;
          height:25px;
          object-fit:contain;
          flex:0 0 auto;
        }

        .store-text{
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          line-height:1;
        }

        .store-small{
          font-size:10px;
          opacity:.8;
        }

        .store-big{
          font-size:13px;
          font-weight:600;
        }

       .forever-qrCard{
  margin-top:32px;

  width:min(520px, 100%);
  background:var(--card);
  border:1px solid var(--line);

  border-radius:24px;
  box-shadow:var(--shadow);

  padding:28px 24px 34px;

  display:flex;
  flex-direction:column;
  align-items:center;
}
       .forever-qrTitle{
  margin:0;
  font-size:22px;
  font-weight:1000;
  text-align:center;
}

.forever-qrSub{
  margin-top:10px;
  max-width:420px;
  font-size:13px;
  line-height:1.45;
  color:var(--muted);
  text-align:center;
}
   .forever-qrWrap{
  margin-top:22px;

  width:240px;
  height:260px;

  border-radius:28px;
  background:rgba(0,0,0,0.05);

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;

  gap:12px;
}
  .forever-qrBox{
  width:180px;
  height:180px;

  display:flex;
  align-items:center;
  justify-content:center;

  position:relative;
}
.forever-qr{
  width:180px;
  height:180px;
  object-fit:contain;
}
  .forever-qrLabel{
  font-size:13px;
  font-weight:500;
  color:#2B2529;
  opacity:.7;
  text-align:center;
}
        .qr-logo{
          position:absolute;
          top:50%;
          left:50%;
          transform:translate(-50%, -50%);
          width:46px;
          height:46px;
         
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 4px 12px rgba(0,0,0,0.15);
        }

      .qr-logo img{
  width:32px;
  height:32px;
  object-fit:contain;
}
.forever-trustRow{
  margin-top:28px;
  width:100%;
  max-width:1200px;        /* reduces total width */
  margin-left:auto;
  margin-right:auto;

  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:16px;
}

.forever-trustCard{
  background:#ECEBEC4D;
  border:1px solid #ECEBEC4D;

  border-radius:18px;
  padding:22px 18px;

  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;

  min-height:180px;

}
.forever-trustIcon{
  width:60px;
  height:60px;
  object-fit:contain;
  display:block;
  margin-bottom:12px;
}

   

        .forever-trustTitle{
          font-size:16px;
          line-height:1.25;
          font-weight:800;
          color:var(--text);
        }

        .forever-trustDesc{
          margin-top:4px;
          font-size:20px;
          line-height:1.4;
          color:var(--muted);
        }

 .forever-faqSection{
  width:100%;
  background:linear-gradient(135deg, #FFF1F2 0%, #FFF7ED 100%);
  border-top:1.44px solid #FFE4E6;
  border-radius:28px;

  padding:48px 28px 48px;
  min-height:420px;

  margin-top:40px;   /* pushes section downward */
}

.forever-faqList{
  width:min(760px, 100%);
  margin:28px auto 0;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.forever-quote{
  width:100%;
  max-width:100%;
  margin:0 auto;
  background:#fff;
  border:1px solid rgba(0,0,0,0.06);
  border-radius:20px;
  padding:24px 22px 22px;
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  box-shadow:0 10px 28px rgba(0,0,0,0.04);
  margin-top:30px;
  margin-bottom:30px;
}
    .forever-faqTitle{
  margin:0;
  font-size:28px;
  line-height:1.1;
  font-weight:800;
  color:var(--text);
  text-align:center;
  letter-spacing:-0.02em;
  margin-bottom:8px;
}
      

        .forever-faqItem{
          background:rgba(255,255,255,0.92);
          border:1px solid rgba(0,0,0,0.05);
          border-radius:14px;
          padding:14px 16px;
        }

        .forever-faqQ{
  font-size:18px;
  line-height:1.4;
  font-weight:800;
  color:var(--text);
}

        .forever-faqA{
  margin-top:8px;
  font-size:15px;
  line-height:1.6;
  color:var(--muted);
}
.forever-faqBottom{
  margin-top:18px;
  font-size:18px;      /* bigger text */
  line-height:1.4;
  
  text-align:center;
  color:#2B2529;
}
.forever-faqLink{
  color:var(--pink);
  font-weight:800;
  font-size:18px;
}

        .forever-quoteHeart{
          width:72px;
          height:72px;
          object-fit:contain;
          display:block;
          margin-bottom:18px;
        }

      .forever-quoteText{
  max-width:580px;
  margin:0 auto;
  font-size:15px;
  line-height:1.6;
  color:rgba(26,26,26,0.72);
  text-align:center;
  font-style: italic;
}

        .forever-quoteAuthor{
          margin-top:10px;
          font-size:13px;
          line-height:1.3;
          font-weight:800;
          color:var(--text);
        }

        .forever-quoteMeta{
          margin-top:2px;
          font-size:11.5px;
          line-height:1.4;
          color:var(--muted);
        }

        .forever-footer{
          margin-top:0;
        }

        img{
          max-width:100%;
          height:auto;
        }

.forever-topbar{
  width:80vw;
  margin:12px auto 0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding-top:30px;
}
.forever-shell{
  width:100%;
  margin:10px auto 0;
  flex:1;
  display:flex;
  justify-content:center;

}
.forever-hero{
  width:100%;
  max-width:100%;
  background:#F6EDEF;
  border-radius:40px;
  padding:72px 40px 56px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  margin:6px auto 0;
  margin-top:20px;
}
.forever-wrap{
  width:80vw;
  max-width:none;
  margin:0 auto;
  padding-left:0;
  padding-right:0;
}

.forever-trustRow{
  margin-top:28px;
  width:100%;
  max-width:none;
  margin-left:auto;
  margin-right:auto;
  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:16px;
}
        @media (max-width: 900px){
          .forever-title{
            font-size:28px;
          }

          .forever-faqTitle{
            font-size:24px;
          }

          .forever-trustRow{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 640px){
         .forever-topbar,
.forever-wrap{
  width:94vw;
}
          .forever-topbar{
            padding-top:14px;
            padding-left:18px;
            padding-right:18px;
          }

       .forever-wrap{
  padding-left:clamp(16px, 4vw, 80px);
  padding-right:clamp(16px, 4vw, 80px);
}

         .forever-hero{
  max-width:100%;
}
          .forever-faqSection{
            border-radius:22px;
            padding:20px 12px 16px;
          }

          .forever-title{
            font-size:24px;
          }

          .forever-sub{
            font-size:12.5px;
          }

          .forever-brand-ico{
            width:38px;
            height:38px;
          }

          .forever-brand-title{
            height:24px;
          }

          .forever-close img{
            width:28px;
            height:28px;
          }

          .forever-qrCard{
            width:100%;
            padding:18px 14px 18px;
            border-radius:18px;
          }

          .forever-qrTitle{
            font-size:18px;
          }

          .forever-qrWrap{
            width:170px;
            height:170px;
          }

          .forever-qr{
            width:140px;
            height:140px;
          }

          .qr-logo{
            width:40px;
            height:40px;
            border-radius:10px;
          }

          .qr-logo img{
            width:22px;
            height:22px;
          }

          .forever-quote{
            border-radius:18px;
            padding:20px 14px 18px;
          }

          .store-btn{
            gap:10px;
            padding:10px 14px 10px 16px;
          }
.store-icon{
  width:25px;
  height:25px;
}

          .store-small{
            font-size:9px;
          }

          .store-big{
            font-size:12px;
          }
        }
      `}</style>

      <div className="forever-topbar">
        <div className="forever-brand">
          <img className="forever-brand-ico" src={logo} alt="Logo" />
          <img className="forever-brand-title" src={logoTitle} alt="us forever" />
        </div>

        <button className="forever-close" type="button" onClick={() => navigate(-1)} aria-label="Close">
          <img src={closeIcon} alt="Close" />
        </button>
      </div>

      <div className="forever-shell">
        <div className="forever-wrap">
         <section className="forever-hero">
  <h1 className="forever-title">Your Forever Begins Now</h1>

  <div className="forever-sub">
    Your subscription is active. Continue your journey on the UsForever mobile app to start creating and
    reliving your wedding memories.
  </div>

  <div className="forever-badges">
    <button className="store-btn" type="button">
      <img className="store-icon" src={downloadAppStore} alt="" />
      <div className="store-text">
        <span className="store-small">Download on the</span>
        <span className="store-big">App Store</span>
      </div>
    </button>

    <button className="store-btn" type="button">
      <img className="store-icon" src={downloadPlayStore} alt="" />
      <div className="store-text">
        <span className="store-small">Get it on</span>
        <span className="store-big">Google Play</span>
      </div>
    </button>
  </div>

  <div className="forever-qrCard">
    <h2 className="forever-qrTitle">Scan to Continue on Your Phone</h2>

    <div className="forever-qrSub">
      Your subscription is active. Continue your journey on the UsForever mobile app to start creating and
      reliving your wedding memories.
    </div>

    <div className="forever-qrWrap">
      <div className="forever-qrBox">
        <img className="forever-qr" src={qrCode} alt="QR code" />
        <div className="qr-logo">
          <img src={logo} alt="logo" />
        </div>
      </div>

      <div className="forever-qrLabel">
        Download The UsForever App
      </div>
    </div>
  </div>
</section>

<div className="forever-trustRow">
  <div className="forever-trustCard">
    <img className="forever-trustIcon" src={securityIcon} alt="" />
    <div className="forever-trustTitle">Bank-Level Security</div>
    <div className="forever-trustDesc">Your memories are encrypted and protected</div>
  </div>

  <div className="forever-trustCard">
    <img className="forever-trustIcon" src={couplesIcon} alt="" />
    <div className="forever-trustTitle">50,000+ Happy Couples</div>
    <div className="forever-trustDesc">Join thousands preserving their memories</div>
  </div>

  <div className="forever-trustCard">
    <img className="forever-trustIcon" src={guaranteeIcon} alt="" />
    <div className="forever-trustTitle">30-Day Guarantee</div>
    <div className="forever-trustDesc">Not in love? Get your money back</div>
  </div>
</div>

          <section className="forever-faqSection">
            <h2 className="forever-faqTitle">Questions About Your Forever Plan?</h2>

            <div className="forever-faqList">
              {faqs.map((item, idx) => (
                <div className="forever-faqItem" key={idx}>
                  <div className="forever-faqQ">{item.q}</div>
                  <div className="forever-faqA">{item.a}</div>
                </div>
              ))}

              <div className="forever-faqBottom">
                Still have questions? <span className="forever-faqLink">Chat with our team</span>
              </div>
            </div>
          </section>

          <section className="forever-quote">
            <img className="forever-quoteHeart" src={heartIcon} alt="" />
            <div className="forever-quoteText">
              “UsForever gave us the perfect place to preserve your wedding memories. The face recognition found photos
              we didn’t even notice existed. It’s more than storage — it’s an entire story, beautifully organized.”
            </div>
            <div className="forever-quoteAuthor">Priya & Aditya</div>
            <div className="forever-quoteMeta">Forever Plan • Married Nov 2024</div>
          </section>
        </div>
      </div>

      <div className="forever-footer">
        <Footer />
      </div>
    </div>
  );
}