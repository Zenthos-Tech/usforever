import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import SignInScreen from "./screens/SignInScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import GalleryScreen from "./screens/GalleryScreen";
import AlbumOpenScreen from "./screens/AlbumOpenScreen";
import PhotoViewerScreen from "./screens/PhotoViewerScreen";

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SignInScreen />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/gallery" element={<GalleryScreen />} />
        <Route path="/album" element={<AlbumOpenScreen />} />
        <Route path="/photo-viewer" element={<PhotoViewerScreen />} />
      </Routes>
    </AnimatePresence>
  );
}
