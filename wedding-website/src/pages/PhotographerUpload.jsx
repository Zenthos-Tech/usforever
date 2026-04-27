import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Footer from "../components/Footer";
import Colors from "../theme/colors";

import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";

import step1Icon from "../assets/1photo.svg";
import step2Icon from "../assets/2photo.svg";
import step3Icon from "../assets/3photo.svg";

import resumeIcon from "../assets/resume.svg";
import duplicateIcon from "../assets/autoduplicate.svg";
import foldersIcon from "../assets/eventfolders.svg";
import fastIcon from "../assets/fastupload.svg";

import passcodeIcon from "../assets/passcode.svg";
import closeIcon from "../assets/close.svg";

import StartUploading from "../components/StartUploading";

export default function PhotographerUpload({
  initialAlbumId = "",
  autoSkipVerify = true,
  onExit,
}) {
  const [stage, setStage] = useState("code");
  const [unlocked, setUnlocked] = useState(false);
const [invalidLinkOpen, setInvalidLinkOpen] = useState(false);
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [coupleName, setCoupleName] = useState("");
  const [weddingTitle, setWeddingTitle] = useState("Upload Photos");
  const [weddingDate, setWeddingDate] = useState("");
  const [weddingId, setWeddingId] = useState("");

  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [albumsVersion, setAlbumsVersion] = useState(0);
  const [albumId, setAlbumId] = useState(initialAlbumId || "");

  const [accessToken, setAccessToken] = useState("");
  const [tokenType, setTokenType] = useState("");

  const [accessOpen, setAccessOpen] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [submittingPass, setSubmittingPass] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);

  // ✅ backend protection state
  const [requiresPassFromApi, setRequiresPassFromApi] = useState(false);
  const [pageError, setPageError] = useState("");

  const passRef = useRef(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlSlug = (params.get("slug") || "").trim();
  const urlToken = (params.get("t") || "").trim();
  const hasServerLink = !!urlSlug && !!urlToken;

  const cssVars = useMemo(
    () => ({
      "--pink": Colors?.primaryPink || "#E8628C",
      "--pinkDark": Colors?.darkPink || "#A5485A",
      "--text": "#121212",
      "--muted": "#7a7a7a",
      "--pageBg": " #FFFFFF",

      "--pillBg": "#ECEBEC",
      "--cardBg": "#ffffff",
      "--border": "rgba(0,0,0,0.10)",
      "--softPink": "rgba(232, 98, 140, 0.08)",
      "--softPink2": "rgba(232, 98, 140, 0.10)",
      "--num": "#b135ff",
    }),
    []
  );

  const API = useMemo(() => {
    const raw = (import.meta.env?.VITE_API_URL || "").trim();
    return raw.replace(/\/+$/, "");
  }, []);

  // ✅ ONLY true when backend says passcode is required and user has not unlocked yet
  const isProtected = useMemo(() => {
    return !!requiresPassFromApi && !unlocked;
  }, [requiresPassFromApi, unlocked]);
function resolvedCanOpenUpload(data) {
  const resolvedWeddingId = String(
    data?.weddingId ||
      data?.wedding?.id ||
      data?.data?.weddingId ||
      data?.data?.wedding?.id ||
      ""
  ).trim();

  return !!resolvedWeddingId;
}
  useEffect(() => {
    if (!accessOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [accessOpen]);

  useEffect(() => {
    if (!accessOpen) return;
    const t = setTimeout(() => passRef.current?.focus?.(), 80);
    return () => clearTimeout(t);
  }, [accessOpen]);

  useEffect(() => {
    if (initialAlbumId) setAlbumId(initialAlbumId);
  }, [initialAlbumId]);

  function formatDateForTopBar(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    return raw;
  }

  function normalizeAlbumRow(item) {
    const attrs = item?.attributes || item || {};
    const rawId = item?.id ?? item?._id ?? attrs?.id ?? attrs?._id ?? "";
    const rawName =
      attrs?.name ||
      attrs?.title ||
      item?.name ||
      item?.title ||
      attrs?.albumName ||
      "";

    const hidden =
      attrs?.hidden === true ||
      attrs?.deletedByUser === true ||
      attrs?.isHidden === true ||
      attrs?.deleted === true ||
      item?.hidden === true ||
      item?.deletedByUser === true ||
      item?.isHidden === true ||
      item?.deleted === true;

    return {
      id: String(rawId || "").trim(),
      title: String(rawName || "").trim() || `Album ${rawId}`,
      hidden,
    };
  }

  // ✅ fallback album fetch if resolve response does not include albums
  const loadAlbums = useCallback(
    async (resolvedWeddingId, preferredAlbumId = "") => {
      const wid = String(resolvedWeddingId || "").trim();

      if (!API || !wid) {
        if (preferredAlbumId) setAlbumId(String(preferredAlbumId));
        return;
      }

      setLoadingAlbums(true);
      try {
        const qs = new URLSearchParams();
        qs.set("weddingId", wid);
        qs.set("_t", Date.now().toString());

        const res = await fetch(`${API}/albums?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        });

        const raw = await res.text();
        let json = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          json = {};
        }

        if (!res.ok) {
          throw new Error(json?.error?.message || json?.message || "Failed to load albums.");
        }

        const rows = Array.isArray(json?.data) ? json.data : [];
        const nextAlbums = rows
          .map(normalizeAlbumRow)
          .filter((a) => a.id && a.title && !a.hidden)
          .map(({ hidden, ...rest }) => rest);

        setAlbums(nextAlbums);
        setAlbumsVersion((v) => v + 1);

        const preferred = String(preferredAlbumId || "").trim();
        const current = String(albumId || "").trim();

        if (preferred && nextAlbums.some((a) => a.id === preferred)) {
          setAlbumId(preferred);
        } else if (current && nextAlbums.some((a) => a.id === current)) {
          setAlbumId(current);
        } else {
          setAlbumId(nextAlbums[0]?.id || "");
        }
      } catch (err) {
        console.error("loadAlbums error:", err);
      } finally {
        setLoadingAlbums(false);
      }
    },
    [API, albumId]
  );

  // ✅ backend call
  async function resolveShareLink({ slug, token, passcode }) {
    if (!API) throw new Error("Missing VITE_API_URL");

    const s = encodeURIComponent(String(slug || "").trim());
    const t = encodeURIComponent(String(token || "").trim());

    const res = await fetch(`${API}/share-links/resolve/${s}?t=${t}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: String(token || "").trim(),
        passcode: String(passcode || "").trim(),
      }),
    });

    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      const errField = data?.error;
      const msg =
        (typeof errField === "string" ? errField : errField?.message) ||
        data?.message ||
        "Password incorrect.";
      throw Object.assign(new Error(msg), { status: res.status, data });
    }

    return data;
  }

  async function applyResolvedShareData(data) {
    console.log("SHARE RESOLVE RAW DATA =", data);

    const resolvedWeddingId = String(
      data?.weddingId ||
        data?.wedding?.id ||
        data?.data?.weddingId ||
        data?.data?.wedding?.id ||
        ""
    ).trim();

    const resolvedAlbumId = String(
      data?.albumId ||
        data?.album?.id ||
        data?.data?.albumId ||
        data?.data?.album?.id ||
        ""
    ).trim();

    const nextBride = String(data?.brideName || data?.data?.brideName || "").trim();
    const nextGroom = String(data?.groomName || data?.data?.groomName || "").trim();
    const nextCouple =
      String(data?.coupleName || data?.data?.coupleName || "").trim() ||
      [nextBride, nextGroom].filter(Boolean).join(" & ");

    const nextWeddingDate = formatDateForTopBar(
      data?.weddingDate || data?.data?.weddingDate
    );

    const nextWeddingTitle =
      String(data?.weddingTitle || data?.data?.weddingTitle || "").trim() ||
      (nextCouple ? `Upload Photos for ${nextCouple} Wedding` : "Upload Photos");

    setBrideName(nextBride);
    setGroomName(nextGroom);
    setCoupleName(nextCouple);
    setWeddingDate(nextWeddingDate);
    setWeddingTitle(nextWeddingTitle);
    setWeddingId(resolvedWeddingId);

    // ✅ save photographer auth
    setAccessToken(String(data?.accessToken || "").trim());
    setTokenType(String(data?.tokenType || "").trim());

    // ✅ use backend flag if returned
    if (typeof data?.requiresPasscode === "boolean") {
      setRequiresPassFromApi(!!data.requiresPasscode);
    }

    const resolvedAlbums = Array.isArray(data?.albums)
      ? data.albums
          .map(normalizeAlbumRow)
          .filter((a) => a.id && a.title && !a.hidden)
          .map(({ hidden, ...rest }) => rest)
      : [];

    console.log("RESOLVED ALBUMS =", resolvedAlbums);

    if (resolvedAlbums.length > 0) {
      setAlbums(resolvedAlbums);

      if (resolvedAlbumId && resolvedAlbums.some((a) => a.id === resolvedAlbumId)) {
        setAlbumId(resolvedAlbumId);
      } else {
        setAlbumId(resolvedAlbums[0]?.id || "");
      }
      return;
    }

    if (resolvedAlbumId) {
      setAlbumId(resolvedAlbumId);
    }

    if (resolvedWeddingId) {
      await loadAlbums(resolvedWeddingId, resolvedAlbumId);
    }
  }

  // ✅ initial backend resolve on page load
  useEffect(() => {
    if (!hasServerLink) return;

    let cancelled = false;

    setCheckingLink(true);
    setUnlocked(false);
    setRequiresPassFromApi(false);
    setPageError("");

    (async () => {
      try {
        const data = await resolveShareLink({
          slug: urlSlug,
          token: urlToken,
          passcode: "",
        });

        if (cancelled) return;

      await applyResolvedShareData(data);
if (cancelled) return;

// Only unlock when backend truly resolved access without passcode
setUnlocked(true);
setRequiresPassFromApi(false);

if (autoSkipVerify && resolvedCanOpenUpload(data)) {
  setStage("upload");
} else {
  setStage("code");
}
      } catch (e) {
        if (cancelled) return;

        const status = e?.status;
        const msg = String(e?.message || "");

        if (status === 401 && /passcode required/i.test(msg)) {
          // ✅ link exists, but locked
          setUnlocked(false);
          setRequiresPassFromApi(true);
          setStage("code");
        }  else {
  setUnlocked(false);
  setStage("code");
  setPageError("");
  setInvalidLinkOpen(true);
}
      } finally {
        if (!cancelled) setCheckingLink(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasServerLink, urlSlug, urlToken, autoSkipVerify]);

  const openAccessModal = () => {
    setPassError("");
    setAccessOpen(true);
  };

  const closeAccessModal = () => {
    setAccessOpen(false);
    setPassInput("");
    setPassError("");
  };

  // ✅ exact required flow
const handleStartUploading = async () => {
  setPageError("");

  if (hasServerLink && (requiresPassFromApi || !unlocked)) {
    openAccessModal();
    return;
  }

 if (!weddingId) {
  setInvalidLinkOpen(true);
  return;
}

  await loadAlbums(weddingId, albumId);
  setStage("upload");
};

  const handleEnterAccessCode = async () => {
    // Only show the passcode modal if the link actually requires one
    if (requiresPassFromApi || (hasServerLink && !unlocked)) {
      openAccessModal();
      return;
    }

    // No passcode required — go directly to album
    if (!weddingId) {
      setInvalidLinkOpen(true);
      return;
    }

    await loadAlbums(weddingId, albumId);
    setStage("upload");
  };

  const canContinue = !submittingPass && (passInput || "").trim().length >= 4;

  // ✅ backend passcode validation call
  const unlockAndContinue = async () => {
    const input = String(passInput || "").replace(/\D/g, "").slice(0, 4);

    if (input.length < 4) {
      setPassError("Enter correct password.");
      return;
    }

  if (!hasServerLink) {
  setAccessOpen(false);
  setInvalidLinkOpen(true);
  return;
}

    try {
      setSubmittingPass(true);
      setPassError("");

      const data = await resolveShareLink({
        slug: urlSlug,
        token: urlToken,
        passcode: input,
      });

      await applyResolvedShareData(data);

      setRequiresPassFromApi(false);
      setUnlocked(true);
      setAccessOpen(false);
      setPassInput("");
      setStage("upload");
    } catch (e) {
      setUnlocked(false);
      setPassError(e?.message || "Password incorrect.");
    } finally {
      setSubmittingPass(false);
    }
  };

  return (
    <div className="pu-page" style={cssVars}>
      {stage !== "upload" ? (
        <div className="pu-top">
          <div className="pu-top-pill">
            <div className="pu-brand">
              <img className="pu-logo" src={logo} alt="logo" />
              <img className="pu-logo-title" src={logoTitle} alt="us forever" />
            </div>

            <div className="pu-top-right">
              <span className="pu-top-muted">Already have a code?</span>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "upload" && unlocked ? (
        <StartUploading
          brideName={brideName}
          groomName={groomName}
          coupleName={coupleName}
          weddingDate={weddingDate}
          weddingTitle={weddingTitle}
          weddingId={weddingId}
          albums={albums}
          albumId={albumId}
          setAlbumId={setAlbumId}
          apiBase={API}
          accessToken={accessToken}
          tokenType={tokenType}
          slug={urlSlug}
          shareToken={urlToken}
          onRefreshAlbums={() => loadAlbums(weddingId, albumId)}
          onAlbumsChange={(updated) => setAlbums(updated)}
          loadingAlbums={loadingAlbums}
          albumsVersion={albumsVersion}
          logo={logo}
          logoTitle={logoTitle}
          onBack={() => setStage("code")}
        />
      ) : (
        <div className="pu-body">
          <h1 className="pu-hero-title">
            A simpler way to deliver
            <br />
            wedding memories
          </h1>

          <p className="pu-hero-sub">
            Upload, organize, and deliver photos without the chaos of drives and links.
          </p>

          {checkingLink ? (
            <div style={{ textAlign: "center", marginTop: 10, color: "#777", fontSize: 12 }}>
              Checking link...
            </div>
          ) : null}

          {loadingAlbums && hasServerLink ? (
            <div style={{ textAlign: "center", marginTop: 8, color: "#777", fontSize: 12 }}>
              Loading latest albums...
            </div>
          ) : null}

          {pageError ? (
            <div style={{ textAlign: "center", color: "#b42318", marginTop: 10, fontSize: 12 }}>
              {pageError}
            </div>
          ) : null}

          <div className="pu-hero-actions">
            <button className="pu-btn-primary" onClick={handleStartUploading}>
              Start Uploading
            </button>

            <button className="pu-btn-outline2" onClick={handleEnterAccessCode}>
              Enter Access Code
            </button>
          </div>

          <div className="pu-section">
            <div className="pu-sec-title">How It Works</div>
            <div className="pu-sec-sub">
              Three simple steps to deliver beautiful wedding photos
            </div>

            <div className="pu-steps">
              <StepCard
                icon={step1Icon}
                title="Receive upload link from couple"
                sub="They’ll share a unique link or code with you."
              />
              <StepCard
                icon={step2Icon}
                title="Upload photos in one place"
                sub="Drag and drop or select files from your computer."
              />
              <StepCard
                icon={step3Icon}
                title="Let couples select their favorites"
                sub="They’ll review and choose photos for their final album."
              />
            </div>
          </div>

          <div className="pu-section pu-section2">
            <div className="pu-sec-title">Built for Photographers</div>
            <div className="pu-sec-sub">
              Professional tools that make your workflow seamless
            </div>

            <div className="pu-features">
              <FeatureCard
                icon={resumeIcon}
                title="Resume uploads anytime"
                sub="Your progress is saved. Pick up right where you left off."
              />
              <FeatureCard
                icon={duplicateIcon}
                title="Automatic duplicate detection"
                sub="Never worry about uploading the same photo twice."
              />
              <FeatureCard
                icon={foldersIcon}
                title="Organized event folders"
                sub="Photos sorted by event folders."
              />
              <FeatureCard
                icon={fastIcon}
                title="Fast, reliable uploads"
                sub="Built for handling hundreds of high-resolution photos."
              />
            </div>
          </div>

          <div className="pu-footerFull">
            <Footer />
          </div>
        </div>
      )}

      {accessOpen ? (
        <div className="pu-modalLayer" role="dialog" aria-modal="true">
          <div
            className="pu-backdrop"
            onClick={closeAccessModal}
          />

          <div className="pu-modalCard">
            <button
              className="pu-modalClose"
              onClick={closeAccessModal}
              aria-label="close"
            >
              <img className="pu-closeImg" src={closeIcon} alt="close" />
            </button>

            <div className="pu-lockCircle">
              <img className="pu-passImg" src={passcodeIcon} alt="passcode" />
            </div>

            <div className="pu-modalTitle">This Album Is Password Protected</div>

            <div className="pu-modalHint">
              Enter the password shared by the couple to
              <br />
              continue
            </div>

            <input
              ref={passRef}
              className={`pu-passInput ${passError ? "pu-passInput--err" : ""}`}
              placeholder="Enter the secured passcode"
              maxLength={4}
              inputMode="numeric"
              value={passInput}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPassInput(next);
                if (passError) setPassError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) unlockAndContinue();
              }}
            />

            {passError ? <div className="pu-passErr">{passError}</div> : <div className="pu-passSpace" />}

            <button
              className={`pu-continue ${canContinue ? "pu-continue--on" : "pu-continue--off"}`}
              onClick={unlockAndContinue}
              disabled={!canContinue}
            >
              {submittingPass ? "CHECKING..." : "CONTINUE"}
            </button>

            <div className="pu-modalFoot">
              Password incorrect? Ask the couple for access.
            </div>
          </div>
        </div>
      ) : null}
            {invalidLinkOpen ? (
        <div className="pu-modalLayer" role="dialog" aria-modal="true">
          <div
            className="pu-backdrop"
            onClick={() => setInvalidLinkOpen(false)}
          />

          <div className="pu-modalCard pu-invalidCard">
            <button
              className="pu-modalClose"
              onClick={() => setInvalidLinkOpen(false)}
              aria-label="close"
            >
              <img className="pu-closeImg" src={closeIcon} alt="close" />
            </button>

            <div className="pu-invalidIconWrap">
              <img className="pu-passImg" src={passcodeIcon} alt="link required" />
            </div>

            <div className="pu-modalTitle">Access Link Required</div>

            <div className="pu-modalHint pu-invalidHint">
              Ask the couple to share the access link
              <br />
              to continue.
            </div>

            <button
              className="pu-continue pu-continue--on"
              onClick={() => setInvalidLinkOpen(false)}
            >
              OKAY
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .pu-page{width:100%;min-height:100vh;background:var(--pageBg);color:var(--text);display:flex;flex-direction:column;}
    .pu-top{
  position:fixed;
  top:20px;
  left:0;
  right:0;
  z-index:1000;
  width:80%;
  margin:0 auto;
  padding-top:28px;
  left:50%;
  transform:translateX(-50%);
}
       .pu-top-pill{
  width:100%;
  margin:0 auto;
background:#ECEBEC60;
  border-radius:999px;
  padding:22px 40px;
  display:flex;
  align-items:center;
  justify-content:space-between;


 
}
        .pu-brand{display:flex;align-items:center;gap:10px;padding-left:8px;}
        .pu-logo{width:40px;height:40px;object-fit:contain;}
        .pu-logo-title{height:22px;object-fit:contain;}
        .pu-top-right{display:flex;align-items:center;gap:14px;padding-right:8px;}
        .pu-top-muted{color: #666263
;font-size:18px;}
        .pu-body{width:min(1180px, 92vw);margin:0 auto;padding:140px 0 0;flex:1;}
        .pu-hero-title{margin:0;text-align:center;font-size:60px;line-height:1.05;letter-spacing:-0.02em;font-weight:900;padding-top:60px;}
        .pu-hero-sub{margin:40px auto 0;text-align:center;max-width:820px;color:var(--muted);font-size:20px;line-height:1.55;}
        .pu-hero-actions{margin:40px auto 0;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}
        .pu-btn-primary{min-width:220px;height:50px;padding:0 22px;border-radius:999px;border:none;background:var(--pink);color: #F6F6F6;
;font-weight:400;font-size:14px;cursor:pointer;box-shadow:0 12px 26px rgba(232,98,140,0.22);}
        .pu-btn-outline2{min-width:220px;height:50px;padding:0 22px;border-radius:999px;border:1px solid rgba(0,0,0,0.14);background:#fff;color: #666263;
;font-weight:400;font-size:14px;cursor:pointer;}
        .pu-section{margin-top:60px;}
        .pu-sec-title{text-align:center;font-size:60px;font-weight:900;margin-top:60px;}
        .pu-sec-sub{text-align:center;color:var(--muted);font-size:20px;margin-top:1px;}
   .pu-steps{
  margin-top:40px;
  display:grid;
  grid-template-columns: repeat(3, 460px);
  justify-content:center;
  gap:24px;
}
      .pu-stepCard{
  background:#FEF0F3;
  border-radius:16px;
  padding:30px 80px 18px;
  text-align:center;
  min-height:300px;
  display:flex;
  flex-direction:column;
  align-items:center;
}

.pu-stepIconTop{
  width:80px;
  height:80px;
  margin-bottom:8px;
}

.pu-stepTitle{
  font-weight:900;
  font-size:30px;
  text-align:center;
  margin:0;
}

.pu-stepSub{
  margin-top:8px;
  color:var(--muted);
  font-size:20px;
  line-height:1.45;
  text-align:center;
}
        .pu-section2{margin-top:120px;}
        .pu-features{margin-top:26px;width:min(1200px, 92vw);margin-left:auto;margin-right:auto;display:grid;grid-template-columns: repeat(2, 1fr);gap:22px;}
.pu-feature{
  background:#FFFFFF;
  border-radius:20px;

  padding:28px 30px;
  min-height:154px;

  display:flex;
  flex-direction:column;
  align-items:flex-start;

  border-style:solid;
  border-width:0 1px 1px 1px;

  /* top right bottom left */
  border-color:transparent rgba(0,0,0,0.015) rgba(0,0,0,0.04) rgba(0,0,0,0.015);

  box-shadow:
    0 1.22px 2.44px rgba(0,0,0,0.10),
    0 1.22px 3.67px rgba(0,0,0,0.10);
}
.pu-fIconWrap{
  width:44px;
  height:44px;
  border-radius:12px;
  background:#F3F3F3;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:20px;
}

.pu-fTitle{
  font-weight:900;
  font-size:18px;
  line-height:1.2;
  margin:0 0 8px 0;
}

.pu-fSub{
  margin:0;
  color:#7B7B7B;
  font-size:14px;
  line-height:1.45;
}   .pu-fIcon{width:32px;height:32px;object-fit:contain;}
       
        .pu-footerFull{width:100vw;margin-left:calc(50% - 50vw);margin-top:120px;}
        .pu-modalLayer{position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;}
        .pu-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.35);backdrop-filter: blur(1px);}
        .pu-modalCard{position:relative;width:min(420px, 92vw);border-radius:22px;background: rgba(255,255,255,0.82);border: 1px solid rgba(255,255,255,0.70);box-shadow: 0 24px 60px rgba(0,0,0,0.30);padding:22px 22px 18px;text-align:center;}
        .pu-modalClose{position:absolute;top:10px;right:12px;border:none;background:transparent;cursor:pointer;padding:6px 10px;border-radius:10px;}
        .pu-closeImg{width:18px;height:18px;object-fit:contain;display:block;}
.pu-passImg{
  width:48px;
  height:48px;
  object-fit:contain;
  display:block;
  margin:10px auto 14px;
}
        .pu-modalTitle{font-weight:900;font-size:25px;margin-top:4px;color:#666263;
}
        .pu-modalHint{margin-top:8px;font-size:12px;color:rgba(0,0,0,0.55);line-height:16px;}
        .pu-passInput{width:min(360px, 86%);height:44px;border-radius:12px;border:1px solid rgba(0,0,0,0.18);padding:0 14px;font-size:13px;outline:none;margin-top:14px;background:#fff;text-align:center;font-weight:900;}
        .pu-passInput--err{border-color: #666263;
;background: rgba(255,90,106,0.06);}
        .pu-passErr{width:min(360px, 86%);margin:6px auto 0;font-size:11px;color:#ff5a6a;text-align:left;}
        .pu-passSpace{height:18px;}
        .pu-continue{width:min(360px, 86%);height:46px;border-radius:14px;border:none;color:#fff;font-weight:900;letter-spacing:0.6px;cursor:pointer;margin-top:10px;}
        .pu-continue--off{background: rgba(0,0,0,0.18);cursor:not-allowed;}
        .pu-continue--on{background: var(--pink);box-shadow: 0 14px 26px rgba(232,98,140,0.22);}
        .pu-modalFoot{margin-top:10px;font-size:11px;color:rgba(0,0,0,0.45)};
        .pu-invalidCard{
  width:min(430px, 92vw);
  padding:26px 22px 22px;
  border-radius:24px;
  background:rgba(255,255,255,0.88);
  border:1px solid rgba(255,255,255,0.72);
  box-shadow:0 24px 60px rgba(0,0,0,0.22);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.pu-invalidIconWrap{
  width:64px;
  height:64px;
  margin:8px auto 12px;
  border-radius:18px;
  background:rgba(232,98,140,0.10);
  display:flex;
  align-items:center;
  justify-content:center;
}

.pu-invalidHint{
  margin-top:10px;
  font-size:13px;
  line-height:1.6;
  color:#666263;
}
  .pu-stepIconWrap{
  width:96px;
  height:96px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:8px;
  flex:0 0 96px;
}

.pu-stepIconTop{
  max-width:100%;
  max-height:100%;
  width:auto;
  height:auto;
  object-fit:contain;
  display:block;
}
        @media (max-width: 1050px){.pu-features{ grid-template-columns: repeat(2, 1fr); }}
        @media (max-width: 920px){.pu-hero-title{ font-size:36px; }.pu-steps{ grid-template-columns:1fr; }.pu-features{ grid-template-columns:1fr; }}
      `
      }</style>
    </div>
  );
}

function StepCard({ icon, title, sub }) {
  return (
    <div className="pu-stepCard">
      <div className="pu-stepIconWrap">
        <img className="pu-stepIconTop" src={icon} alt="" />
      </div>
      <div className="pu-stepTitle">{title}</div>
      <div className="pu-stepSub">{sub}</div>
    </div>
  );
}

function FeatureCard({ icon, title, sub }) {
  return (
    <div className="pu-feature">
      <div className="pu-fIconWrap">
        <img className="pu-fIcon" src={icon} alt="" />
      </div>
      <div>
        <div className="pu-fTitle">{title}</div>
        <div className="pu-fSub">{sub}</div>
      </div>
    </div>
  );
}