import {
  CheckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "../components/Icons";

const PricingPage = ({ setPage }) => (
  <>
    {/* Hero */}
    <section className="pricing-hero">
      <h2 className="section-title">Forever Album Plan</h2>
      <p className="section-subtitle" style={{marginBottom: 0}}>Everything you need to preserve your wedding memories</p>
      <div className="pricing-steps">
        <div className="pricing-step">
          <div className="pricing-step-icon"><CreditCardIcon /></div>
          <h4>Choose Your Plan</h4>
          <p>Select the perfect<br/>plan for your needs</p>
        </div>
        <div className="pricing-arrow"><ArrowRightIcon /></div>
        <div className="pricing-step">
          <div className="pricing-step-icon"><ShieldCheckIcon /></div>
          <h4>Secure Checkout</h4>
          <p>Enter payment<br/>details safely</p>
        </div>
        <div className="pricing-arrow"><ArrowRightIcon /></div>
        <div className="pricing-step">
          <div className="pricing-step-icon"><CheckCircleIcon /></div>
          <h4>Start Uploading</h4>
          <p>Begin preserving<br/>your memories</p>
        </div>
      </div>
    </section>

    {/* Plan Card */}
    <section style={{padding: '60px 5%', background: 'var(--pink-light)'}}>
      <div className="plan-card">
        <div className="plan-header">
          <div className="plan-label">Premium Plan</div>
          <div className="plan-price">$49.99 <span>/per year</span></div>
          <div className="plan-tagline">Find every photo with your face instantly</div>
        </div>
        <div className="plan-features">
          <div className="plan-feature"><CheckIcon /> 300GB secure cloud storage</div>
          <div className="plan-feature"><CheckIcon /> AI-powered facial discovery</div>
          <div className="plan-feature"><CheckIcon /> TV viewing & casting</div>
          <div className="plan-feature"><CheckIcon /> Unlimited family sharing</div>
          <div className="plan-feature"><CheckIcon /> Long-term preservation guarantee</div>
          <div className="plan-feature"><CheckIcon /> Priority support</div>
        </div>
        <div className="plan-footer">
          <button className="cta-btn" style={{width: '100%', maxWidth: 300}}>Unlock Your Forever</button>
          <p className="plan-guarantee">14-day money-back guarantee · Cancel anytime</p>
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="faq-section">
      <h2 className="section-title">Questions About Your Forever Plan?</h2>
      <p className="section-subtitle">&nbsp;</p>
      <div className="faq-list">
        <div className="faq-item">
          <div className="faq-question">Can I upgrade or downgrade later?</div>
          <div className="faq-answer">Absolutely! You can change your plan anytime. When upgrading, you'll only pay the prorated difference.</div>
        </div>
        <div className="faq-item">
          <div className="faq-question">What happens if I cancel?</div>
          <div className="faq-answer">You'll have access until the end of your billing period. You can download all your photos before your subscription ends.</div>
        </div>
        <div className="faq-item">
          <div className="faq-question">Is the Eternal plan really lifetime?</div>
          <div className="faq-answer">Yes! One payment, lifetime access. Your memories will be preserved as long as UsForever exists, with guaranteed storage for life.</div>
        </div>
        <div className="faq-item">
          <div className="faq-question">Can multiple people access the account?</div>
          <div className="faq-answer">Yes! All plans support sharing. The couple can both access and manage the account, and you can share albums with family and friends.</div>
        </div>
      </div>
      <div className="faq-cta">Still have questions? <a>Chat with our team</a></div>
    </section>

    {/* Testimonial */}
    <section className="pricing-testimonial">
      <div className="pricing-testimonial-icon">❝</div>
      <p className="pricing-testimonial-text">"UsForever gave us the perfect place to preserve our wedding memories. The face recognition found photos of our grandparents we didn't even know existed. It's more than storage—it's our love story, beautifully organized."</p>
      <div className="pricing-testimonial-author">Priya & Aditya</div>
      <div className="pricing-testimonial-meta">Forever Plan · Married Nov 2024</div>
    </section>
  </>
);

export default PricingPage;