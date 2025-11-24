import './LandingPage.css';
import GameSelectionCard from '../../components/gameSelectionCard/gameSelectionCard';
import BreadCrumb from '../../components/breadcrumbs/breadCrumb';
import CJSImage from  '../../assets/png/conjs-img.png'
import LoadingSpinner from '../../components/loadingSpinner/LoadingSpinner';
import A from  '../../assets/png/letter-a.png'
import B from  '../../assets/png/letter-b.png'
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getCalibration } from "../../scripts/calibration";

const gameInfos = [
  {
    name: 'Search-in-the-Crowd-A',
    title: 'FAST_CC',
    domain: 'Visual Search',
    gameUri: 'search-in-the-crowd-cc',
    image: `${A}`,
  },
  {
    name: 'Search-in-the-Crowd-B',
    title: 'FAST_TC',
    domain: 'Visual Search',
    gameUri: 'search-in-the-crowd-tc',
    image: `${B}`,
  },
  // {
  //   name: 'Search-in-the-Crowd',
  //   title: 'FAST_with_Neutral',
  //   domain: 'Visual Search',
  //   gameUri: 'search-in-the-crowd',
  //   image: `${CJSImage}`,
  // },
]

type LandingState = { fromTask?: boolean; ts?: number; next?: string } | null;
function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navLock = useRef(false); // กัน navigate ซ้ำ
  const state = (location.state as LandingState) || null;

  const [nonce, setNonce] = useState<number>(() => state?.ts ?? 0);

  useEffect(() => {
    if (navLock.current) return;

    // 1) ยังไม่คาลิเบรต → ส่งไป /calibration
    const calib = getCalibration();
    if (!calib) {
      navLock.current = true;
      navigate("/calibration", { replace: true, state: { next: "/landing" } });
      return;
    }

    // 2) กลับมาจาก task → รีเฟรชการ์ด (soft remount) แล้วล้าง state ที่ติดมากับ history
    if (state?.fromTask) {
      setNonce(state.ts || Date.now());
      navLock.current = true;
      navigate("/landing", { replace: true, state: null });
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, navigate]);

  return (
    <div className='h-screen w-full bg-slate-50 relative'>
      <div className="row">
        <BreadCrumb />
        <div className='w-full px-6 sm:px-24 py-6 sm:py-36'>
          <GameSelectionCard key={nonce} games={gameInfos} />
          {/* ปุ่มให้ผู้คุมกด recalibrate ได้เอง */}
          {/* <div className="mt-6">
            <button
              className="text-sm text-gray-600 underline"
              onClick={() => navigate("/calibration", { state: { next: "/landing" } })}
            >
              Re-calibrate หน้าจอ
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
export default LandingPage;