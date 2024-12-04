import './LandingPage.css';
import GameSelectionCard from '../../components/gameSelectionCard/gameSelectionCard';
import BreadCrumb from '../../components/breadcrumbs/breadCrumb';
import CJSImage from  '../../assets/png/conjs-img.png'
import LoadingSpinner from '../../components/loadingSpinner/LoadingSpinner';
import { useEffect } from 'react';
import React from 'react';

const gameInfos = [
  // {
  //   name: 'Face In The Crowd A',
  //   title: 'หาเธอในฝูงชน A',
  //   domain: 'Track A',
  //   gameUri: 'face-in-the-crowd-A',
  //   image: `${CJSImage}`,
  // },
  // {
  //   name: 'Face In The Crowd B',
  //   title: 'หาเธอในฝูงชน B',
  //   domain: 'Track B',
  //   gameUri: 'face-in-the-crowd-B',
  //   image: `${CJSImage}`,
  // },
  {
    name: 'Face In The Crowd 2.0',
    title: 'หาเธอในฝูงชน',
    domain: 'Visual Search',
    gameUri: 'face-in-the-crowd-2.0',
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