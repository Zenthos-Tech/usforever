import { useEffect, useState } from "react";
import { PersonIcon } from "./Icons";
import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";

const Navbar = ({ page, setPage, onLoginClick, onGetStartedClick }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [mobileOpen]);

  const goLanding = () => {
    setMobileOpen(false);
    setPage?.("landing");
  };

  const goPhotographer = () => {
    setMobileOpen(false);
    setPage?.("photographer-upload");
  };

  const scrollToId = (id) => {
    setMobileOpen(false);

    setTimeout(() => {
      const el = document.getElementById(id);

      if (!el) {
        window.location.hash = `#${id}`;
        return;
      }

      const y = el.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 0);
  };

  const goPricing = () => {
    if (page !== "landing") setPage?.("landing");
    setTimeout(() => scrollToId("pricing"), 50);
  };

  const goLogin = () => {
    setMobileOpen(false);
    if (typeof onLoginClick === "function") onLoginClick();
    else setPage?.("login");
  };

  const goGetStarted = () => {
    setMobileOpen(false);
    if (typeof onGetStartedClick === "function") onGetStartedClick();
    else setPage?.("get-started");
  };

  const onLogoKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goLanding();
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-pill">
            <div
              className="nav-logo"
              onClick={goLanding}
              onKeyDown={onLogoKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Go to home"
            >
              <img className="nav-logo-icon-img" src={logo} alt="Logo" />
              <img className="nav-logo-title-img" src={logoTitle} alt="Us Forever" />
            </div>

            {page === "landing" ? (
              <div className="nav-links">
                <button
                  className="nav-link"
                  type="button"
                  onClick={() => scrollToId("how-it-works")}
                >
                  How It Works
                </button>

                <button
                  className="nav-link"
                  type="button"
                  onClick={goPhotographer}
                >
                  For Photographer
                </button>

                <button className="nav-link" type="button" onClick={goPricing}>
                  Pricing
                </button>

                <button
                  className="nav-link"
                  type="button"
                  onClick={() => scrollToId("contact")}
                >
                  Contact Us
                </button>

                <button className="nav-link nav-link--login" type="button" onClick={goLogin}>
                  Login
                </button>
              </div>
            ) : (
              <div />
            )}

            <div className="nav-right">
              {page === "landing" ? (
                <button className="nav-btn" type="button" onClick={goGetStarted}>
                  Get Started
                </button>
              ) : (
                <button
                  className="nav-profile"
                  type="button"
                  onClick={() => setPage?.("profile")}
                  aria-label="Profile"
                >
                  <PersonIcon />
                </button>
              )}

              <button
                className={`nav-menu-btn ${mobileOpen ? "open" : ""}`}
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`mobile-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className={`mobile-nav ${mobileOpen ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="mobile-nav-header">
          <div
            className="nav-logo"
            onClick={goLanding}
            onKeyDown={onLogoKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Go to home"
          >
            <img className="nav-logo-icon-img" src={logo} alt="Logo" />
            <img className="nav-logo-title-img" src={logoTitle} alt="Us Forever" />
          </div>

          <button
            className="mobile-close-btn"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>

        {page === "landing" ? (
          <div className="mobile-nav-links">
            <button className="mobile-nav-link" type="button" onClick={goLanding}>
              Home
            </button>

            <button
              className="mobile-nav-link"
              type="button"
              onClick={() => scrollToId("how-it-works")}
            >
              How It Works
            </button>

            <button
              className="mobile-nav-link"
              type="button"
              onClick={goPhotographer}
            >
              For Photographer
            </button>

            <button className="mobile-nav-link" type="button" onClick={goPricing}>
              Pricing
            </button>

            <button
              className="mobile-nav-link"
              type="button"
              onClick={() => scrollToId("contact")}
            >
              Contact Us
            </button>

            <button
              className="mobile-nav-link mobile-nav-link--login"
              type="button"
              onClick={goLogin}
            >
              Login
            </button>

            <button className="nav-btn nav-btn--mobile" type="button" onClick={goGetStarted}>
              Get Started
            </button>
          </div>
        ) : (
          <div className="mobile-nav-links">
            <button
              className="mobile-nav-link"
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setPage?.("profile");
              }}
            >
              Profile
            </button>

            <button className="nav-btn nav-btn--mobile" type="button" onClick={goLanding}>
              Go Home
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;