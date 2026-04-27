// src/App.jsx
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import LoginModal from "./components/loginmodal";
import PlanModal from "./components/PlanModal";
import PhotographerUpload from "./pages/PhotographerUpload";

// ✅ NEW: forever screen route
import ForeverScreen from "./components/ForeverScreen";

function MarketingShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const urlPage = location.pathname === "/pricing" ? "pricing" : "landing";

  const [page, setPage] = useState(urlPage);
  const [loginOpen, setLoginOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    setPage(urlPage);
  }, [urlPage]);

  useEffect(() => window.scrollTo(0, 0), [page]);

  const openLogin = () => setLoginOpen(true);

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    setPlanOpen(true);
  };

const handleSetPage = (next) => {
  setPage(next);

  if (next === "pricing") {
    navigate("/pricing");
    return;
  }

  if (next === "photographer-upload") {
    navigate("/photographer");
    return;
  }

  navigate("/");
};
  return (
    <div className="page-wrapper">
      <Navbar
        page={page}
        setPage={handleSetPage}
        onLoginClick={openLogin}
        onGetStartedClick={openLogin}
      />

      {page === "landing" ? (
        <LandingPage setPage={handleSetPage} onGetStartedClick={openLogin} />
      ) : (
        <PricingPage setPage={handleSetPage} />
      )}

      <Footer />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* ✅ Plan modal stays here; button inside it navigates to /forever */}
      <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
    </div>
  );
}

function PhotographerRoute() {
  const navigate = useNavigate();
  const { code } = useParams();
  const [sp] = useSearchParams();

  const token = sp.get("t") || "";
  const slug = sp.get("slug") || "";
  const queryCode = sp.get("code") || "";

  const finalCode = code || queryCode || slug;

  return (
    <div className="page-wrapper">
     <PhotographerUpload
  initialCode={finalCode}
  autoSkipVerify={false}
  onExit={() => navigate("/")}
/>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* marketing pages */}
      <Route path="/" element={<MarketingShell />} />
      <Route path="/pricing" element={<MarketingShell />} />

      {/* ✅ NEW: forever screen */}
      <Route path="/forever" element={<ForeverScreen />} />

      {/* photographer upload */}
      <Route path="/photographer" element={<PhotographerRoute />} />
      <Route path="/photographer/:code" element={<PhotographerRoute />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}