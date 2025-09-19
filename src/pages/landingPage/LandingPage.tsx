import './LandingPage.css';
import GameSelectionCard from '../../components/gameSelectionCard/gameSelectionCard';
import BreadCrumb from '../../components/breadcrumbs/breadCrumb';
import CJSImage from  '../../assets/png/conjs-img.png'
import LoadingSpinner from '../../components/loadingSpinner/LoadingSpinner';
import { useEffect } from 'react';
import React from 'react';

const gameInfos = [
  {
    name: 'Search-in-the-Crowd',
    title: 'FAST',
    domain: 'Visual Search',
    gameUri: 'search-in-the-crowd',
    image: `${CJSImage}`,
  },
]

function LandingPage() {

  useEffect(() => {
    const hasReloaded = sessionStorage.getItem('hasReloaded'); // ตรวจสอบใน sessionStorage

    // ถ้ายังไม่เคยรีโหลด
    if (!hasReloaded) {
      sessionStorage.setItem('hasReloaded', 'true'); // ตั้งค่าใน sessionStorage
      window.location.reload(); // ทำการรีโหลดหน้าเว็บ
    }
  }, []);;

  return (
    <div className='h-screen w-full bg-slate-50'>
      <div className="row">
            {<BreadCrumb />}
        <div className='w-full px-6 sm:px-24 py-6 sm:py-36'>
              {<GameSelectionCard games={gameInfos} />}
        </div>
      </div>
    </div>
  )
}

export default LandingPage