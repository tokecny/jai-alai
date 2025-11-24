import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/landingPage/LandingPage';
import LoadingSpinner from './components/loadingSpinner/LoadingSpinner';
import ParticipantForm from './pages/participantForm/participantForm';
import CalibLite from './components/calibrate/CalibLite';
import Instructions from './pages/gameInstruction/Instructions';
import { getDataFromLocalStorage } from './uitls/offline';
import FAST_3R_10B from './pages/game/FAST_3R_10B';
import FAST_2R_15B_CC from './pages/game/FAST_2R_15B_CC';
import FAST_2R_15B_TC from './pages/game/FAST_2R_15B_TC';
import ProtectedRoute from './components/protectionRoute';


function App() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // ฟังก์ชันสำหรับป้องกันการซูมในโทรศัพท์
    const handleTouchMove = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // ฟังก์ชันสำหรับป้องกันการซูมในคอม
    const handleZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };  

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("wheel", handleZoom, { passive: false });
    window.addEventListener("keydown", handleZoom);

    // ฟังก์ชันจัดการขนาดเอกสาร
    documentHeightWidth();
    window.addEventListener('resize', documentHeightWidth);
    window.addEventListener('orientationchange', documentHeightWidth);

    let id = getDataFromLocalStorage('userId');
    if (id !== null) {
      setUserId(id);
    } else {
      // if (window.location.href === "https://tokecny.github.io/jai-alai/"){
      // } else {
      //   window.location.replace("https://tokecny.github.io/jai-alai/");
      // }
    }

    // คืนค่าเพื่อทำความสะอาด
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("wheel", handleZoom);
      window.removeEventListener("keydown", handleZoom);
    };
  }, []);

  function documentHeightWidth() {
    let calWidth = '' + document.documentElement.clientWidth;
    let calHeight = '' + document.documentElement.clientHeight;
    let calSum = (+calWidth) + (+calHeight);
    let vh = window.innerHeight * 0.01;

    document.documentElement.style.setProperty('--this-width', calWidth + 'px');
    document.documentElement.style.setProperty('--this-height', calHeight + 'px');
    document.documentElement.style.setProperty('--this-sum', calSum + 'px');
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }

  return (
    <Router>
  <Routes>
    <Route path="/" element={<ParticipantForm setUserId={setUserId} />} />
    <Route path="/calibration" element={<CalibLite />} />

    <Route
      path="/instructions"
      element={
        <ProtectedRoute>
          <Instructions />
        </ProtectedRoute>
      }
    />

    <Route
      path="/landing"
      element={
        <ProtectedRoute>
          <LandingPage />
        </ProtectedRoute>
      }
    />

    <Route
      path="/search-in-the-crowd-cc"
      element={
        <ProtectedRoute>
          <FAST_2R_15B_CC userId={(userId ?? 0)} />
        </ProtectedRoute>
      }
    />
    <Route
      path="/search-in-the-crowd-tc"
      element={
        <ProtectedRoute>
          <FAST_2R_15B_TC userId={(userId ?? 0)} />
        </ProtectedRoute>
      }
    />

    {/* ถ้าจะเก็บของเดิมไว้ */}
    {/* <Route path="/search-in-the-crowd" element={<ProtectedRoute><FAST_3R_10B userId={(userId ?? 0)} /></ProtectedRoute>} /> */}
  </Routes>
    <LoadingSpinner />
  </Router>
  );
}

export default App;
