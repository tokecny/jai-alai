import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/landingPage/LandingPage';
import FITC2 from './pages/game/FITC2';
import LoadingSpinner from './components/loadingSpinner/LoadingSpinner';
import ParticipantForm from './pages/participantForm/participantForm';
import { getDataFromLocalStorage } from './uitls/offline';

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
        <Route path="/landing" element={<LandingPage />} />
        {/* <Route path="/face-in-the-crowd-A" element={<CJSGame userId={userId}/>} />
        <Route path="/face-in-the-crowd-B" element={<CJSGame userId={userId}/>} /> */}
        <Route path="/face-in-the-crowd-2.0" element={<FITC2 userId={userId}/>} />
        {/* <Route path="/face-in-the-crowd/instruction" element={<CJSInstruction />} /> */}
        {/* <Route path="/face-in-the-crowd/trial" element={<CJSGame userId={userId} />} /> */}
      </Routes>
      <LoadingSpinner />
    </Router>
  );
}

export default App;
