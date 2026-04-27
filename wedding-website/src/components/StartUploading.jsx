import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "../components/Footer";
import AlbumPreviewScreen from "../components/AlbumPreviewScreen";

import calendarIcon from "../assets/Calendar.svg";
import folderIcon from "../assets/file.svg";
import foldersIcon from "../assets/files.svg";
import plusIcon from "../assets/add.svg";
import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";
import backIcon from "../assets/back.svg";
import namesHeartIcon from "../assets/couplename.svg";
import storageIcon from "../assets/storage.svg";
import moreIcon from "../assets/dots.svg";
import doughnutIcon from "../assets/Doughnut.svg";
import closeIcon from "../assets/close.svg";
import renameIcon from "../assets/rename.svg";
import deleteIcon from "../assets/delete.svg";

const TOTAL_STORAGE_BYTES = 300 * 1024 * 1024 * 1024; // 300 GB

export default function StartUploading({
  brideName,
  groomName,
  coupleName,
  weddingDate,
  weddingTitle,
  weddingId,
  albums,
  albumId,
  setAlbumId,
  apiBase,
  userId,
  onRefreshAlbums,
  onAlbumsChange,
  loadingAlbums = false,
  albumsVersion = 0,
  onBack,
}) {
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [persistedAlbums, setPersistedAlbums] = useState([]);
  const [persistedImageBytes, setPersistedImageBytes] = useState(0);
  const [persistedVideoBytes, setPersistedVideoBytes] = useState(0);
  const [isStorageLoading, setIsStorageLoading] = useState(false);

  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showRenameAlbumModal, setShowRenameAlbumModal] = useState(false);
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState(false);
  const [albumModalValue, setAlbumModalValue] = useState("");
  const [activeAlbumForAction, setActiveAlbumForAction] = useState(null);
  const [folderActionOpenId, setFolderActionOpenId] = useState("");
  const [folderActionAnchor, setFolderActionAnchor] = useState({ left: 0, top: 0 });
  const [albumActionBusy, setAlbumActionBusy] = useState(false);

  const [showAlbumPreview, setShowAlbumPreview] = useState(false);
  const [previewAlbum, setPreviewAlbum] = useState(null);

  const folderActionRefs = useRef({});

  const normalizedApiBase = useMemo(() => {
    const raw = String(apiBase || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }, [apiBase]);

  const storageKey = useMemo(() => {
    return `PU_STORAGE_BYTES_${String(weddingId || "default")}`;
  }, [weddingId]);

  const displayCouple = useMemo(() => {
    return (
      String(coupleName || "").trim() ||
      [brideName, groomName].filter(Boolean).join(" & ") ||
      "Couple"
    );
  }, [brideName, groomName, coupleName]);

  const displayTitle = useMemo(() => {
    return `Upload Photos for ${displayCouple} Wedding`;
  }, [displayCouple]);

const displayDate = useMemo(() => {
  const raw = String(weddingDate || "").trim();
  if (!raw) return "";

  // handle DD-MM-YYYY format
  const parts = raw.split("-");

  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    const d = new Date(year, month - 1, day);

    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  // fallback for ISO or other formats
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return raw;
}, [weddingDate]);

  const visibleAlbums = useMemo(() => {
    const isTrue = (v) => v === true || v === "true" || v === 1 || v === "1";

    return (albums || []).filter((a) => {
      const hidden =
        isTrue(a?.hidden) ||
        isTrue(a?.deletedByUser) ||
        isTrue(a?.isHidden) ||
        isTrue(a?.deleted) ||
        isTrue(a?.attributes?.hidden) ||
        isTrue(a?.attributes?.deletedByUser) ||
        isTrue(a?.attributes?.isHidden) ||
        isTrue(a?.attributes?.deleted);

      return !hidden;
    });
  }, [albums]);

  const albumsToRender = useMemo(() => {
    if (persistedAlbums.length) return persistedAlbums;
    return visibleAlbums;
  }, [visibleAlbums, persistedAlbums]);

  const usedImagesBytes = useMemo(() => Math.max(0, persistedImageBytes), [persistedImageBytes]);
  const usedVideosBytes = useMemo(() => Math.max(0, persistedVideoBytes), [persistedVideoBytes]);

  const totalUsedBytes = useMemo(() => {
    return usedImagesBytes + usedVideosBytes;
  }, [usedImagesBytes, usedVideosBytes]);

  const availableBytes = useMemo(() => {
    return Math.max(0, TOTAL_STORAGE_BYTES - totalUsedBytes);
  }, [totalUsedBytes]);

  const availableDisplayGb = useMemo(() => {
    return Math.max(0, Math.round(availableBytes / (1024 * 1024 * 1024)));
  }, [availableBytes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setPersistedImageBytes(Number(parsed?.imageBytes || 0));
      setPersistedVideoBytes(Number(parsed?.videoBytes || 0));
    } catch {
      setPersistedImageBytes(0);
      setPersistedVideoBytes(0);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!normalizedApiBase || !weddingId) return;

    let active = true;

    const loadStorageSummary = async () => {
      setIsStorageLoading(true);

      try {
        const res = await fetch(
          `${normalizedApiBase}/photos/storage-summary?weddingId=${encodeURIComponent(
            String(weddingId)
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "ngrok-skip-browser-warning": "true",
            },
          }
        );

        const raw = await res.text();
        let json = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          json = {};
        }

        if (!res.ok) {
          throw new Error(
            json?.error?.message || json?.message || "Failed to fetch storage summary."
          );
        }

        const imageBytes = Number(
          json?.data?.imageBytes ??
            json?.data?.imagesBytes ??
            json?.data?.usedImageBytes ??
            json?.data?.usedBytes ??
            0
        );

        const videoBytes = Number(
          json?.data?.videoBytes ??
            json?.data?.videosBytes ??
            json?.data?.usedVideoBytes ??
            0
        );

        const safeImageBytes = Number.isFinite(imageBytes) ? Math.max(0, imageBytes) : 0;
        const safeVideoBytes = Number.isFinite(videoBytes) ? Math.max(0, videoBytes) : 0;

        if (!active) return;

        setPersistedImageBytes(safeImageBytes);
        setPersistedVideoBytes(safeVideoBytes);

        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              imageBytes: safeImageBytes,
              videoBytes: safeVideoBytes,
            })
          );
        } catch {}
      } catch (err) {
        console.error("storageSummary error:", err);
      } finally {
        if (active) setIsStorageLoading(false);
      }
    };

    loadStorageSummary();

    return () => {
      active = false;
    };
  }, [normalizedApiBase, weddingId, storageKey]);

  // One-time init: populate persistedAlbums as soon as we have any album data
  const albumsInitRef = useRef(false);
  useEffect(() => {
    if (albumsInitRef.current) return;
    if (!visibleAlbums.length) return;
    albumsInitRef.current = true;
    setPersistedAlbums(visibleAlbums);
  }, [visibleAlbums]);

  // Re-sync on every confirmed server fetch (loadAlbums bumps albumsVersion)
  useEffect(() => {
    if (albumsVersion === 0) return;
    albumsInitRef.current = true;
    setPersistedAlbums(visibleAlbums);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumsVersion]);


  useEffect(() => {
    const handleDocClick = (e) => {
      if (!folderActionOpenId) return;
      const refNode = folderActionRefs.current?.[folderActionOpenId];
      if (refNode && refNode.contains(e.target)) return;
      setFolderActionOpenId("");
    };

    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [folderActionOpenId]);

  useEffect(() => {
    if (loadingAlbums) return;
    if (!albumsToRender.length) return;

    const stillExists = albumsToRender.some((a) => String(a?.id) === String(albumId));
    if (!stillExists) {
      setAlbumId(String(albumsToRender[0].id));
    }
  }, [albumId, albumsToRender, setAlbumId, loadingAlbums]);

  const extractAlbumLabel = (a) => {
    return (
      String(a?.title || a?.name || a?.attributes?.title || a?.attributes?.name || "").trim() ||
      "Album"
    );
  };

  const openAlbumPreview = (album) => {
    if (!album) return;
    setAlbumId(String(album.id));
    setPreviewAlbum(album);
    setShowAlbumPreview(true);
    setFolderActionOpenId("");
  };

  const closeAlbumPreview = () => {
    setShowAlbumPreview(false);
    setPreviewAlbum(null);
  };

  const openFolderActions = (album, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveAlbumForAction(album);
    setFolderActionAnchor({
      left: rect.left + window.scrollX + rect.width / 2,
      top: rect.bottom + window.scrollY + 10,
    });
    setFolderActionOpenId((prev) => (prev === String(album?.id) ? "" : String(album?.id)));
  };

  const openCreateAlbum = () => {
    setAlbumModalValue("");
    setShowCreateAlbumModal(true);
    setFolderActionOpenId("");
  };

  const openRenameAlbum = () => {
    if (!activeAlbumForAction) return;
    setAlbumModalValue(extractAlbumLabel(activeAlbumForAction));
    setShowRenameAlbumModal(true);
    setFolderActionOpenId("");
  };

  const openDeleteAlbum = () => {
    if (!activeAlbumForAction) return;
    setShowDeleteAlbumModal(true);
    setFolderActionOpenId("");
  };

  const createAlbum = async () => {
    const title = String(albumModalValue || "").replace(/\s+/g, " ").trim();
    if (!title || albumActionBusy) return;
    if (!normalizedApiBase || !weddingId) {
      alert("Missing API base or weddingId");
      return;
    }

    setAlbumActionBusy(true);
    const tempId = `tmp_${Date.now()}`;

    try {
      const optimistic = {
        id: tempId,
        title,
        hidden: false,
      };
      setPersistedAlbums((prev) => {
        const next = [...prev, optimistic];
        onAlbumsChange?.(next);
        return next;
      });
      setShowCreateAlbumModal(false);

      const res = await fetch(`${normalizedApiBase}/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          data: {
            title,
            weddingId: String(weddingId),
            hidden: false,
          },
        }),
      });

      const raw = await res.text();
      let json = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        const e = json?.error;
        throw new Error((typeof e === "string" ? e : e?.message) || json?.message || "Album create failed.");
      }

      const createdId = json?.data?.id;
      const createdTitle = json?.data?.attributes?.title || json?.data?.title || title;

      if (createdId) {
        setAlbumId(String(createdId));
      }

      await onRefreshAlbums?.();

      if (createdId) {
        setPersistedAlbums((prev) =>
          prev.map((x) =>
            String(x.id) === String(tempId) ? { ...x, id: createdId, title: createdTitle } : x
          )
        );
      }
    } catch (err) {
      setPersistedAlbums((prev) => prev.filter((x) => String(x.id) !== String(tempId)));
      alert(String(err?.message || "Album create failed."));
    } finally {
      setAlbumActionBusy(false);
    }
  };

  const renameAlbum = async () => {
    const title = String(albumModalValue || "").replace(/\s+/g, " ").trim();
    if (!title || !activeAlbumForAction || albumActionBusy) return;

    const idStr = String(activeAlbumForAction?.id || "").trim();
    if (!normalizedApiBase || !idStr || idStr.startsWith("tmp_")) {
      alert("Album is still saving, please wait.");
      return;
    }

    setAlbumActionBusy(true);
    const prevAlbums = [...persistedAlbums];

    try {
      setPersistedAlbums((prev) => {
        const next = prev.map((x) =>
          String(x.id) === idStr
            ? { ...x, title, name: title, attributes: { ...x.attributes, title } }
            : x
        );
        onAlbumsChange?.(next);
        return next;
      });
      setShowRenameAlbumModal(false);

      const res = await fetch(`${normalizedApiBase}/albums/${idStr}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ title }),
      });

      const raw = await res.text();
      let json = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        const e = json?.error;
        throw new Error((typeof e === "string" ? e : e?.message) || json?.message || "Album rename failed.");
      }

      await onRefreshAlbums?.();
    } catch (err) {
      setPersistedAlbums(prevAlbums);
      alert(String(err?.message || "Album rename failed."));
    } finally {
      setAlbumActionBusy(false);
    }
  };

  const deleteAlbum = async () => {
    if (!activeAlbumForAction || albumActionBusy) return;

    const idStr = String(activeAlbumForAction?.id || "").trim();
    if (!normalizedApiBase || !idStr || idStr.startsWith("tmp_")) {
      alert("Album is still saving, please wait.");
      return;
    }

    setAlbumActionBusy(true);
    const prevAlbums = [...persistedAlbums];

    try {
      setPersistedAlbums((prev) => {
        const next = prev.filter((x) => String(x.id) !== idStr);
        onAlbumsChange?.(next);
        return next;
      });
      setShowDeleteAlbumModal(false);

      const res = await fetch(`${normalizedApiBase}/albums/${idStr}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      const raw = await res.text();
      let json = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        const e = json?.error;
        throw new Error((typeof e === "string" ? e : e?.message) || json?.message || "Album delete failed.");
      }

      if (String(albumId) === idStr) {
        const remaining = prevAlbums.filter((x) => String(x.id) !== idStr);
        if (remaining.length) {
          setAlbumId(String(remaining[0].id));
        } else {
          setAlbumId("");
        }
      }

      await onRefreshAlbums?.();
    } catch (err) {
      setPersistedAlbums(prevAlbums);
      alert(String(err?.message || "Album delete failed."));
    } finally {
      setAlbumActionBusy(false);
    }
  };

  return (
    <div className="pu-uploadPage">
      <div className="pu-mainHeaderFixed">
        <div className="pu-mainHeader">
          <div className="pu-mainHeaderLeft">
            <button
              type="button"
              className="pu-backBtn"
              onClick={() => onBack?.()}
              aria-label="Go back"
            >
              <img src={backIcon} alt="Back" />
            </button>

            <img className="pu-brandLogo" src={logo} alt="UsForever" />
            <img className="pu-brandTitle" src={logoTitle} alt="UsForever" />
          </div>

          <div className="pu-mainHeaderRight">
            <div className="pu-topMeta">
              <img className="pu-topHeartIcon" src={namesHeartIcon} alt="Couple names" />
              <span className="pu-topText">{displayCouple}</span>
            </div>

            <div className="pu-topMeta">
              <img className="pu-topIcon" src={calendarIcon} alt="calendar" />
              <span className="pu-topText">{displayDate || "Wedding Date"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pu-uploadWrap">
        <div className="pu-uploadHeader">
          <div className="pu-uploadIntro">
            <div className="pu-uploadTitle">{displayTitle}</div>
            <div className="pu-uploadSub">
              Select a folder and start uploading your beautiful wedding photos
            </div>
          </div>

          <div className="pu-controls">
            <div className="pu-selectWrap">
              <div className="pu-labelRow">
                <div className="pu-label2">Select Event Folder</div>
              </div>

              <div className="pu-folderRow">
                {albumsToRender.length ? (
                  <>
                  <div className="pu-folderBtns">
                    {albumsToRender.map((a) => {
                      const active = String(albumId) === String(a.id);
                      const label = extractAlbumLabel(a);

                      return (
                        <div
                          key={a.id}
                          className="pu-folderActionWrap"
                          ref={(node) => {
                            folderActionRefs.current[String(a.id)] = node;
                          }}
                        >
                          <div
                            className={`pu-folderBtn ${active ? "pu-folderBtn--active" : ""}`}
                            onClick={() => openAlbumPreview(a)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openAlbumPreview(a);
                              }
                            }}
                          >
                            <div className="pu-folderBtnMain">
                              <img className="pu-folderIcon" src={folderIcon} alt="" />
                              <span className="pu-folderName">{label}</span>
                            </div>

                            <button
                              type="button"
                              className="pu-folderMoreBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFolderActions(a, e);
                              }}
                              aria-label={`More options for ${label}`}
                            >
                              <img className="pu-folderMoreIcon" src={moreIcon} alt="" />
                            </button>
                          </div>

                          {folderActionOpenId === String(a.id) ? (
                            <div
                              className="pu-folderPopover"
                              style={{
                                left: `${folderActionAnchor.left}px`,
                                top: `${folderActionAnchor.top}px`,
                              }}
                            >
                              <button
                                type="button"
                                className="pu-folderPopoverAction"
                                onClick={openRenameAlbum}
                              >
                                <img
                                  className="pu-folderPopoverActionIcon"
                                  src={renameIcon}
                                  alt="Rename"
                                />
                                <span className="pu-folderPopoverActionText">Rename</span>
                              </button>

                              <button
                                type="button"
                                className="pu-folderPopoverAction pu-folderPopoverAction--danger"
                                onClick={openDeleteAlbum}
                              >
                                <img
                                  className="pu-folderPopoverActionIcon"
                                  src={deleteIcon}
                                  alt="Delete"
                                />
                                <span className="pu-folderPopoverActionText">Delete</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>{/* pu-folderBtns */}

                    <button type="button" className="pu-addFolderBtn" onClick={openCreateAlbum}>
                      <img src={plusIcon} alt="" />
                      <span>Add folder</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="pu-noAlbums">
                      {loadingAlbums
                        ? "Loading albums..."
                        : "No albums found. Refresh once, or check whether the couple has created folders."}
                    </div>

                    <button type="button" className="pu-addFolderBtn" onClick={openCreateAlbum}>
                      <img src={plusIcon} alt="" />
                      <span>Add folder</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pu-simpleStage">
          <button
            type="button"
            className="pu-storageFloating"
            onClick={() => setShowStorageModal(true)}
            aria-label="Open storage analysis"
          >
            <img className="pu-storageFloatingIcon" src={doughnutIcon} alt="Storage" />

            <div className="pu-storageFloatingText">
              <div className="pu-storageFloatingLabel">
                {isStorageLoading ? "Loading..." : "Available"}
              </div>

              <div className="pu-storageFloatingValue">
                <span className="pu-storageBold">{availableDisplayGb} GB</span>
                <span className="pu-storageSlash"> / </span>
                <span className="pu-storageTotal">300 GB</span>
              </div>
            </div>
          </button>
        </div>

        <div className="pu-footerFull">
          <Footer />
        </div>
      </div>

      {showStorageModal ? (
        <StorageAnalysisModal
          onClose={() => setShowStorageModal(false)}
          totalBytes={TOTAL_STORAGE_BYTES}
          usedImagesBytes={usedImagesBytes}
          usedVideosBytes={usedVideosBytes}
          availableBytes={availableBytes}
          closeIcon={closeIcon}
          storageIcon={storageIcon}
          doughnutIcon={doughnutIcon}
        />
      ) : null}

      {showCreateAlbumModal ? (
        <AlbumModal
          mode="create"
          title="Create Album"
          value={albumModalValue}
          setValue={setAlbumModalValue}
          onClose={() => {
            if (!albumActionBusy) setShowCreateAlbumModal(false);
          }}
          onSubmit={createAlbum}
          closeIcon={closeIcon}
          folderIcon={foldersIcon}
          busy={albumActionBusy}
        />
      ) : null}

      {showRenameAlbumModal ? (
        <AlbumModal
          mode="rename"
          title="Rename Album"
          value={albumModalValue}
          setValue={setAlbumModalValue}
          onClose={() => {
            if (!albumActionBusy) setShowRenameAlbumModal(false);
          }}
          onSubmit={renameAlbum}
          closeIcon={closeIcon}
          folderIcon={foldersIcon}
          busy={albumActionBusy}
        />
      ) : null}

      {showDeleteAlbumModal ? (
        <ConfirmDeleteModal
          onClose={() => {
            if (!albumActionBusy) setShowDeleteAlbumModal(false);
          }}
          onConfirm={deleteAlbum}
          closeIcon={closeIcon}
          busy={albumActionBusy}
          label={extractAlbumLabel(activeAlbumForAction)}
        />
      ) : null}

     {showAlbumPreview ? (
  <AlbumPreviewScreen
    visible={showAlbumPreview}
    album={previewAlbum}
    apiBase={apiBase}
    weddingId={weddingId}
    onClose={closeAlbumPreview}
    onPhotosUploaded={({ imageBytes, videoBytes }) => {
      setPersistedImageBytes((p) => {
        const next = p + imageBytes;
        try {
          const raw = localStorage.getItem(storageKey);
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(storageKey, JSON.stringify({
            ...parsed,
            imageBytes: next,
            videoBytes: (parsed.videoBytes || 0) + videoBytes,
          }));
        } catch {}
        return next;
      });
      setPersistedVideoBytes((p) => p + videoBytes);
    }}
  />
) : null}
      <style>{`
        .pu-uploadPage{
          width:100%;
          min-height:100vh;
          background: #FFFFFF;

        }
.pu-uploadWrap{
  width:80%;
  margin:0 auto;
  padding:140px 0 0;
  box-sizing:border-box;
}

.pu-mainHeaderFixed{
  position:fixed;
  top:20px;
  left:0;
  right:0;
  z-index:1000;
  display:flex;
  justify-content:center;
  padding:20px 0 0;
  pointer-events:none;
}

.pu-mainHeaderFixed > .pu-mainHeader{
  width:80%;
  pointer-events:all;
}

.pu-mainHeaderFixed .pu-uploadWrap{
  padding-top:0;
}

.pu-mainHeader{
  width:100%;
  min-height:80px;
  margin:0 auto;
  border-radius:999px;
  background:#ECEBEC60;

  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 36px 10px 22px;
  gap:20px;
  box-sizing:border-box;
}

        .pu-mainHeaderLeft{
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
          flex:1;
        }

        .pu-backBtn{
          width:42px;
          height:22px;
          border:none;
          background:transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          padding:0;
          flex:0 0 auto;
        }

        .pu-backBtn img{
          width:30px;
          height:22px;
          object-fit:contain;
        }

        .pu-brandLogo{
          width:40px;
          height:40px;
          object-fit:contain;
          flex:0 0 auto;
        }

        .pu-brandTitle{
          height:25px;
          width:auto;
          object-fit:contain;
          flex:0 0 auto;
          display:block;
        }

     .pu-mainHeaderRight{
  display:flex;
  align-items:center;
  justify-content:flex-start;   /* move items left */
  gap:26px;
  flex-wrap:wrap;
  padding-right:20px;           /* space from right edge */
}

        .pu-topMeta{
          display:flex;
          align-items:center;
          gap:8px;
          color:#2b2b2b;
          font-size:14px;
          font-weight:500;
          white-space:nowrap;
        }

        .pu-topHeartIcon{
          width:16px;
          height:16px;
          object-fit:contain;
          flex:0 0 auto;
          display:block;
        }

        .pu-topText{
          color:#2b2b2b;
          font-size:14px;
          font-weight:500;
        }

        .pu-topIcon{
          width:14px;
          height:14px;
          object-fit:contain;
          flex:0 0 auto;
        }

.pu-uploadHeader{
  width:100%;
  max-width:1500px;
  margin:0 auto;
  margin-top:70px;
  margin-left:22px;
  display:flex;
  flex-direction:column;
  gap:0;
}  .pu-uploadIntro{
          width:100%;
        }

       .pu-uploadTitle{
  font-size:clamp(18px, 2.6vw, 40px);
  line-height:1.06;
  letter-spacing:-0.03em;
  font-weight:900;
  color:#000000;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:clip;
}
        .pu-uploadSub{
          margin-top:10px;
          color: #666263;

          font-size:22px;
          line-height:1.45;
        }

        .pu-controls{
          display:flex;
          gap:10px;
          align-items:flex-end;
          flex-wrap:wrap;
          width:100%;
        }

        .pu-selectWrap{
          margin-top:26px;
          min-width:100%;
        }

        .pu-labelRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:18px;
        }

        .pu-label2{
          font-size:15px;
          color:#303030;
          font-weight:500;
          margin-top:10px;
        }

  .pu-folderRow{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:nowrap;
  width:100%;
  justify-content:space-between;
}

  .pu-folderBtns{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}


.pu-addFolderBtn{
  min-height:42px;
  padding:9px 18px;
  border-radius:12px;
  border:1px solid rgba(32,32,32,0.38);
  background:#fff;
  color:#2d2d2d;
  font-size:14px;
  margin-left:auto;
  font-weight:500;
  display:flex;
  align-items:center;
  gap:8px;
  cursor:pointer;
  margin-top:2px;
  margin-left:auto;     /* remove huge push */
  white-space:nowrap;
  flex:0 0 auto;
}
        .pu-addFolderBtn img{
          width:14px;
          height:14px;
          object-fit:contain;
        }

    

        .pu-folderActionWrap{
          position:relative;
          display:inline-block;
        }

        .pu-folderBtn{
          height:42px;
          min-height:42px;
          padding:0 10px 0 12px;
          border-radius:12px;
          border:1px solid rgba(32,32,32,0.28);
          background:#fff;
          color:#2b2b2b;
          font-size:14px;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          box-sizing:border-box;
          white-space:nowrap;
        }

        .pu-folderBtnMain{
          display:flex;
          align-items:center;
          gap:8px;
          white-space:nowrap;
          flex:0 1 auto;
        }

        .pu-folderName{
          white-space:nowrap;
          font-weight:500;
          line-height:1;
        }

        .pu-folderMoreBtn{
          width:16px;
          height:16px;
          min-width:16px;
          min-height:16px;
          border:none;
          background:transparent;
          box-shadow:none;
          outline:none;
          padding:0;
          margin:0;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
          cursor:pointer;
        }

        .pu-folderMoreBtn:hover,
        .pu-folderMoreBtn:focus,
        .pu-folderMoreBtn:active{
          border:none;
          background:transparent;
          box-shadow:none;
          outline:none;
        }

        .pu-folderMoreIcon{
          width:15px;
          height:15px;
          object-fit:contain;
          display:block;
        }

        .pu-folderBtn--active{
          background:#EF6A8A;
          color:#fff;
          border-color:#EF6A8A;
        }

        .pu-folderIcon{
          width:30px;
          height:30px;
          object-fit:contain;
          flex:0 0 auto;
        }

        .pu-folderBtn--active .pu-folderIcon,
        .pu-folderBtn--active .pu-folderMoreIcon{
          filter:brightness(0) invert(1);
        }

        .pu-folderPopover{
          position:fixed;
          transform:translateX(-50%);
          min-width:120px;
          background:#ECEBEC60;
          border-radius:14px;
          box-shadow:0 16px 40px rgba(0,0,0,0.12);
          padding:8px 10px;
          z-index:1200;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          align-items:center;
        }

        .pu-folderPopoverAction{
          border:none;
          background:transparent;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          padding:2px 4px;
          cursor:pointer;
        }

        .pu-folderPopoverActionIcon{
          width:16px;
          height:16px;
          object-fit:contain;
          display:block;
        }

        .pu-folderPopoverActionText{
          font-size:9px;
          line-height:1.1;
          color:#2b2b2b;
          font-weight:500;
        }

        .pu-folderPopoverAction--danger .pu-folderPopoverActionText{
          color:#FF3A3A;
        }

        .pu-noAlbums{
          border:1px dashed rgba(0,0,0,0.16);
          background:rgba(0,0,0,0.02);
          color:#666;
          border-radius:14px;
          padding:12px 14px;
          font-size:13px;
        }

       

.pu-simpleStage{
  position:relative;
  min-height:120px;
  margin-top:40px;
  width:100%;
}

.pu-storageFloating{
  position:fixed;
  left:0;
  bottom:420px;
  height:80px;
  min-width:190px;
  border:none;
  background:#EEEEEEBD;
  backdrop-filter:blur(6px);
  border-radius:0 12px 12px 0;   /* left edge touching screen */
  display:flex;
  align-items:center;
  gap:12px;
  padding:0 14px 0 12px;
  cursor:pointer;
  box-sizing:border-box;
  transition:transform 120ms ease, box-shadow 120ms ease;
}
.pu-storageFloating:active{
  transform:scale(0.96);
}   .pu-storageFloatingIcon{
          width:52px;
          height:52px;
          object-fit:contain;
          flex:0 0 auto;
        }

        .pu-storageFloatingText{
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          text-align:center;
          line-height:1.1;
          margin-right:auto;
        }

        .pu-storageFloatingLabel{
          font-size:10px;
          line-height:1.2;
          color:#6d6d6d;
        }

        .pu-storageFloatingValue{
          margin-top:2px;
          font-size:12px;
          line-height:1.25;
          color:#2b2b2b;
          font-weight:800;
        }

        .pu-storageBold{
          font-weight:600;
          color:#2b2b2b;
        }

        .pu-storageTotal{
          font-weight:400;
          color:#6b6b6b;
        }

        .pu-storageSlash{
          font-weight:400;
          margin:0 2px;
        }

        .pu-footerFull{
          width:100vw;
          margin-left:calc(50% - 50vw);
          margin-top:20px;
        }

        @media (max-width: 920px){
          .pu-mainHeader{
            border-radius:24px;
            padding:14px 16px;
            align-items:flex-start;
            flex-direction:column;
          }

          .pu-mainHeaderLeft,
          .pu-mainHeaderRight{
            width:100%;
          }

          .pu-mainHeaderRight{
            justify-content:flex-start;
            gap:12px;
          }

          .pu-uploadHeader{
            padding-left:0;
          }

          .pu-uploadTitle{
            font-size:clamp(14px, 4.5vw, 38px);
          }

          .pu-uploadSub{
            font-size:15px;
          }

          .pu-simpleStage{
            margin-top:80px;
            min-height:180px;
          }
        }

        @media (max-width: 640px){
          .pu-uploadWrap{
            width:92vw;
            padding-top:18px;
          }

          .pu-brandTitle{
            height:18px;
          }

          .pu-topText{
            font-size:13px;
          }

          .pu-uploadTitle{
            font-size:clamp(12px, 5vw, 32px);
          }

          .pu-folderBtn{
            width:100%;
            justify-content:flex-start;
          }

          .pu-addFolderBtn{
            width:100%;
            justify-content:center;
          }
            

          .pu-storageFloating{
            position:relative;
            left:auto;
            bottom:auto;
            margin-top:40px;
          }
        }
      `}</style>
    </div>
  );
}

function AlbumModal({
  mode,
  title,
  value,
  setValue,
  onClose,
  onSubmit,
  closeIcon,
  folderIcon,
  busy,
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const dismiss = (cb) => {
    if (exiting) return;
    setExiting(true);
    timerRef.current = setTimeout(cb, 190);
  };

  const handleClose = () => { if (!busy) dismiss(onClose); };
  const handleSubmit = () => { if (!busy) dismiss(onSubmit); };

  return (
    <div
      className={`pu-folderModalOverlay${exiting ? " pu-folderModalOverlay--out" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`pu-folderModalCard${exiting ? " pu-folderModalCard--out" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pu-folderModalClose" type="button" onClick={handleClose} disabled={busy}>
          <img src={closeIcon} alt="Close" />
        </button>

        <div className="pu-folderModalIconWrap">
          <img src={folderIcon} alt="Folder" />
        </div>

        <div className="pu-folderModalTitle">{title}</div>

        <input
          className="pu-folderModalInput"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "create" ? "Album Name" : "Rename album"}
          autoFocus
          disabled={busy || exiting}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
        />

        <button type="button" className="pu-folderModalPrimary" onClick={handleSubmit} disabled={exiting}>
          {busy ? "Please wait..." : mode === "create" ? "Create" : "Save"}
        </button>

        <style>{`
          @keyframes pu-overlayIn{
            from{opacity:0;}
            to{opacity:1;}
          }
          @keyframes pu-overlayOut{
            from{opacity:1;}
            to{opacity:0;}
          }
          @keyframes pu-cardIn{
            from{opacity:0;transform:scale(0.88) translateY(10px);}
            to{opacity:1;transform:scale(1) translateY(0);}
          }
          @keyframes pu-cardOut{
            from{opacity:1;transform:scale(1) translateY(0);}
            to{opacity:0;transform:scale(0.9) translateY(8px);}
          }

          .pu-folderModalOverlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.30);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:1400;
            padding:20px;
            animation:pu-overlayIn 180ms ease both;
          }
          .pu-folderModalOverlay--out{
            animation:pu-overlayOut 190ms ease both;
          }

          .pu-folderModalCard{
            width:min(380px, 92vw);
            background:#FFFFFFD9;
            backdrop-filter:blur(8px);
            border-radius:28px;
            padding:22px 24px 26px;
            position:relative;
            box-shadow:0 24px 60px rgba(0,0,0,0.16);
            animation:pu-cardIn 220ms cubic-bezier(0.34,1.3,0.64,1) both;
          }
          .pu-folderModalCard--out{
            animation:pu-cardOut 190ms cubic-bezier(0.4,0,0.6,1) both;
            pointer-events:none;
          }

          .pu-folderModalClose{
            position:absolute;
            top:18px;
            right:18px;
            width:24px;
            height:24px;
            border:none;
            background:transparent;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            padding:0;
          }

          .pu-folderModalClose img{
            width:14px;
            height:14px;
            object-fit:contain;
            opacity:0.72;
          }

          .pu-folderModalIconWrap{
            width:62px;
            height:62px;
            border-radius:999px;
            border:1.5px solid #EF6A8A;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:8px auto 20px;
            background:rgba(255,255,255,0.55);
          }

          .pu-folderModalIconWrap img{
            width:24px;
            height:24px;
            object-fit:contain;
          }

          .pu-folderModalTitle{
            text-align:center;
            font-size:18px;
            line-height:1.2;
            font-weight:900;
            color:#6A6266;
            margin-bottom:22px;
          }

          .pu-folderModalInput{
            width:100%;
            height:46px;
            border-radius:14px;
            border:1px solid rgba(0,0,0,0.26);
            background:#fff;
            padding:0 16px;
            outline:none;
            font-size:15px;
            color:#5a5a5a;
            box-shadow:none;
            appearance:none;
            -webkit-appearance:none;
          }

          .pu-folderModalInput:focus,
          .pu-folderModalInput:focus-visible,
          .pu-folderModalInput:active{
            outline:none;
            border:1px solid rgba(0,0,0,0.18);
            box-shadow:none;
          }

          .pu-folderModalInput::placeholder{
            color:#9a9a9a;
          }

          .pu-folderModalPrimary{
            margin-top:16px;
            width:100%;
            height:42px;
            border:none;
            border-radius:14px;
            background:#EF6A8A;
            color:#fff;
            font-size:15px;
            font-weight:800;
            cursor:pointer;
          }

          .pu-folderModalPrimary:active:not(:disabled){
            transform:scale(0.97);
            transition:transform 80ms ease;
          }

          .pu-folderModalPrimary:disabled,
          .pu-folderModalClose:disabled{
            opacity:0.65;
            cursor:not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ onClose, onConfirm, closeIcon, busy, label }) {
  return (
    <div className="pu-deleteModalOverlay" onClick={onClose}>
      <div className="pu-deleteModalCard" onClick={(e) => e.stopPropagation()}>
        <button className="pu-deleteModalClose" type="button" onClick={onClose} disabled={busy}>
          <img src={closeIcon} alt="Close" />
        </button>

        <div className="pu-deleteModalDanger">!</div>

        <div className="pu-deleteModalTitle">Delete folder?</div>
        <div className="pu-deleteModalSub">
          This will delete <strong>{label || "this folder"}</strong> from app and remove it from
          your album list.
        </div>

        <div className="pu-deleteModalBtnRow">
          <button
            type="button"
            className="pu-deleteBtn pu-deleteBtn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="pu-deleteBtn pu-deleteBtn--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>

        <style>{`
          .pu-deleteModalOverlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.34);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:1450;
            padding:20px;
          }

          .pu-deleteModalCard{
            width:min(390px, 92vw);
            background:#FFFFFFF2;
            backdrop-filter:blur(8px);
            border-radius:26px;
            padding:24px 22px 22px;
            position:relative;
            box-shadow:0 24px 60px rgba(0,0,0,0.16);
          }

          .pu-deleteModalClose{
            position:absolute;
            top:16px;
            right:16px;
            width:24px;
            height:24px;
            border:none;
            background:transparent;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            padding:0;
          }

          .pu-deleteModalClose img{
            width:14px;
            height:14px;
            object-fit:contain;
            opacity:0.72;
          }

          .pu-deleteModalDanger{
            width:54px;
            height:54px;
            border-radius:999px;
            margin:4px auto 14px;
            background:#FFF1F4;
            border:1px solid rgba(239,106,138,0.34);
            color:#EF6A8A;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:28px;
            font-weight:900;
          }

          .pu-deleteModalTitle{
            text-align:center;
            font-size:20px;
            line-height:1.2;
            font-weight:900;
            color:#5F585B;
          }

          .pu-deleteModalSub{
            margin-top:10px;
            text-align:center;
            color:#8B8488;
            font-size:13px;
            line-height:1.5;
          }

          .pu-deleteModalBtnRow{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:18px;
          }

          .pu-deleteBtn{
            height:42px;
            border-radius:14px;
            font-size:14px;
            font-weight:800;
            cursor:pointer;
          }

          .pu-deleteBtn--ghost{
            border:1px solid #2D2A2B;
            background:#fff;
            color:#2D2A2B;
          }

          .pu-deleteBtn--danger{
            border:1px solid #EF6A8A;
            background:#EF6A8A;
            color:#fff;
          }

          .pu-deleteBtn:disabled,
          .pu-deleteModalClose:disabled{
            opacity:0.65;
            cursor:not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

function StorageAnalysisModal({
  onClose,
  totalBytes,
  usedImagesBytes,
  usedVideosBytes,
  availableBytes,
  closeIcon,
  storageIcon,
  doughnutIcon,
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const dismiss = () => {
    if (exiting) return;
    setExiting(true);
    timerRef.current = setTimeout(onClose, 200);
  };

  const safeTotal = Math.max(1, Number(totalBytes || 1));

  const imagesPct = Math.max(0, Math.min(100, (usedImagesBytes / safeTotal) * 100));
  const videosPct = Math.max(0, Math.min(100, (usedVideosBytes / safeTotal) * 100));
  const availablePct = Math.max(0, Math.min(100, (availableBytes / safeTotal) * 100));

  return (
    <div
      className={`pu-storageModalOverlay${exiting ? " pu-storageModalOverlay--out" : ""}`}
      onClick={dismiss}
    >
      <div
        className={`pu-storageModal${exiting ? " pu-storageModal--out" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pu-storageClose" type="button" onClick={dismiss}>
          <img src={closeIcon} alt="Close" />
        </button>

        <div className="pu-storageTopIcon">
          <img src={storageIcon} alt="Storage" />
        </div>

        <div className="pu-storageTitle">Storage Analysis</div>
        <div className="pu-storageSub">Detailed breakdown of your upload storage</div>

        <div className="pu-storageRingWrap">
          <div className="pu-doughnutWrapper">
            <img src={doughnutIcon} className="pu-doughnutIcon" alt="Storage donut" />
          </div>
        </div>

        <div className="pu-storageCenterText">
          <div className="pu-storageCenterLabel">Available</div>
          <div className="pu-storageCenterValue">{fmtBytes(availableBytes)}</div>
          <div className="pu-storageCenterTotal">Total {fmtBytes(totalBytes)}</div>
        </div>

        <div className="pu-storageStatsCard">
          <StorageRow
            label="Images"
            value={fmtBytes(usedImagesBytes)}
            pct={imagesPct}
            tone="images"
          />
          <StorageRow
            label="Videos"
            value={fmtBytes(usedVideosBytes)}
            pct={videosPct}
            tone="videos"
          />
          <StorageRow
            label="Available"
            value={fmtBytes(availableBytes)}
            pct={availablePct}
            tone="available"
          />
        </div>

        <style>{`
          @keyframes pu-storageOverlayIn{
            from{opacity:0;}
            to{opacity:1;}
          }
          @keyframes pu-storageOverlayOut{
            from{opacity:1;}
            to{opacity:0;}
          }
          @keyframes pu-storageCardIn{
            from{opacity:0;transform:scale(0.9) translateY(18px);}
            to{opacity:1;transform:scale(1) translateY(0);}
          }
          @keyframes pu-storageCardOut{
            from{opacity:1;transform:scale(1) translateY(0);}
            to{opacity:0;transform:scale(0.9) translateY(18px);}
          }

          .pu-storageModalOverlay{
            position:fixed;
            inset:0;
            background:transparent;
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999;
            padding:20px;
            animation:pu-storageOverlayIn 200ms ease both;
          }
          .pu-storageModalOverlay--out{
            animation:pu-storageOverlayOut 200ms ease both;
          }

          .pu-storageModal{
            width:min(520px, 92vw);
            background:#FFFFFFD9;
            border-radius:24px;
            padding:26px 22px 20px;
            position:relative;
            box-shadow:0 24px 60px rgba(0,0,0,0.16);
            animation:pu-storageCardIn 260ms cubic-bezier(0.34,1.2,0.64,1) both;
          }
          .pu-storageModal--out{
            animation:pu-storageCardOut 200ms cubic-bezier(0.4,0,0.6,1) both;
            pointer-events:none;
          }

          .pu-storageClose{
            position:absolute;
            right:16px;
            top:14px;
            width:24px;
            height:24px;
            border:none;
            background:transparent;
            cursor:pointer;
            padding:0;
            display:flex;
            align-items:center;
            justify-content:center;
          }

          .pu-storageClose img{
            width:14px;
            height:14px;
            object-fit:contain;
          }

          .pu-storageTopIcon{
            width:56px;
            height:56px;
            border-radius:999px;
            border:1px solid #ef6a8a;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto 12px;
          }

          .pu-storageTopIcon img{
            width:22px;
            height:22px;
            object-fit:contain;
          }

          .pu-storageTitle{
            font-size:20px;
            line-height:1.2;
            font-weight:900;
            color:#5a5a5a;
            text-align:center;
          }

          .pu-storageSub{
            margin-top:8px;
            color:#666263;
            font-size:12px;
            text-align:center;
          }

          .pu-storageRingWrap{
            width:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            margin-top:18px;
            text-align:center;
          }

          .pu-doughnutWrapper{
            width:110px;
            height:110px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto;
          }

          .pu-doughnutIcon{
            width:110px;
            height:110px;
            object-fit:contain;
            display:block;
          }

          .pu-storageCenterText{
            margin-top:10px;
            text-align:center;
          }

          .pu-storageCenterLabel{
            font-size:12px;
            color:#8c8c8c;
          }

          .pu-storageCenterValue{
            font-size:18px;
            line-height:1.15;
            color:#444;
            font-weight:900;
          }

          .pu-storageCenterTotal{
            font-size:12px;
            color:#7f7f7f;
          }
            
  .pu-storageModalOverlay{
    position:fixed;
    inset:0;
    background:transparent;
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999;
    padding:24px;
  }

  .pu-storageModal{
    width:min(520px, 92vw);
    background:#FFFFFFD9;
    border-radius:24px;
    padding:32px 28px 26px;
    position:relative;
    box-shadow:0 24px 60px rgba(0,0,0,0.16);
    box-sizing:border-box;
  }

  .pu-storageClose{
    position:absolute;
    right:18px;
    top:16px;
    width:24px;
    height:24px;
    border:none;
    background:transparent;
    cursor:pointer;
    padding:0;
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .pu-storageClose img{
    width:14px;
    height:14px;
    object-fit:contain;
  }

  .pu-storageTopIcon{
    width:58px;
    height:58px;
    border-radius:999px;
    border:1px solid #ef6a8a;
    display:flex;
    align-items:center;
    justify-content:center;
    margin:0 auto 14px;
  }

  .pu-storageTopIcon img{
    width:22px;
    height:22px;
    object-fit:contain;
  }

  .pu-storageTitle{
    font-size:24px;
    line-height:1.2;
    font-weight:900;
    color:#5a5a5a;
    text-align:center;
  }

  .pu-storageSub{
    margin-top:8px;
    color:#666263;
    font-size:13px;
    text-align:center;
  }

  .pu-storageRingWrap{
    width:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    margin-top:22px;
    text-align:center;
  }

  .pu-doughnutWrapper{
    width:118px;
    height:118px;
    display:flex;
    align-items:center;
    justify-content:center;
    margin:0 auto;
  }

  .pu-doughnutIcon{
    width:118px;
    height:118px;
    object-fit:contain;
    display:block;
  }

  .pu-storageCenterText{
    margin-top:12px;
    text-align:center;
  }

  .pu-storageCenterLabel{
    font-size:12px;
    color:#8c8c8c;
  }

  .pu-storageCenterValue{
    font-size:20px;
    line-height:1.15;
    color:#444;
    font-weight:900;
  }

  .pu-storageCenterTotal{
    font-size:12px;
    color:#7f7f7f;
  }

  .pu-storageStatsCard{
    margin-top:20px;
    border-radius:18px;
    background:#fafafa;
    border:1px solid rgba(0,0,0,0.06);
    padding:20px 18px 10px;
  }


         
        `}</style>
      </div>
    </div>
  );
}

function StorageRow({ label, value, pct, tone }) {
  const toneColor =
    tone === "images" ? "#F06286" : tone === "videos" ? "#A93551" : "#F6CCD6";

  return (
    <div className="pu-storageRow">
      <div className="pu-storageRowLeft">
        <span className="pu-storageDot" style={{ background: toneColor }} />
        <div className="pu-storageRowText">
          <div className="pu-storageRowLabel">{label}</div>
          <div className="pu-storageRowValue">{value}</div>
        </div>
      </div>

      <div className="pu-storageMiniBar">
        <div
          className="pu-storageMiniBarFill"
          style={{
            width: `${pct > 0 ? Math.max(4, Math.min(100, pct)) : 0}%`,
            background: toneColor,
          }}
        />
      </div>

      <style>{`
        .pu-storageRow{
          display:grid;
          grid-template-columns:minmax(120px, 1fr) 1fr;
          gap:18px;
          align-items:center;
          margin-bottom:16px;
        }

        .pu-storageRowLeft{
          display:flex;
          align-items:flex-start;
          gap:10px;
        }

        .pu-storageDot{
          width:10px;
          height:10px;
          border-radius:999px;
          margin-top:7px;
          flex:0 0 auto;
        }

        .pu-storageRowText{
          min-width:0;
        }

        .pu-storageRowLabel{
          font-size:16px;
          color:#444;
          font-weight:700;
          line-height:1.2;
        }

        .pu-storageRowValue{
          margin-top:6px;
          font-size:14px;
          color:#8f8f8f;
        }

        .pu-storageMiniBar{
          height:3px;
          background:#e8e1e3;
          border-radius:999px;
          overflow:hidden;
        }

        .pu-storageMiniBarFill{
          height:100%;
          border-radius:999px;
          transition:width 220ms ease;
        }
      `}</style>
    </div>
  );
}

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;

  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }

  if (i >= 3) {
    return `${Math.round(v)} ${units[i]}`;
  }

  return `${v.toFixed(1)} ${units[i]}`;
}