import GameSelectionCard from '../../components/gameSelectionCard/gameSelectionCard';
import BreadCrumb from '../../components/breadcrumbs/breadCrumb';
import A from '../../assets/png/letter-a.png';
import B from '../../assets/png/letter-b.png';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getCalibration } from '../../scripts/calibration';

// Each selection first enters the shared FAST Practice task.
// App.tsx maps these routes to the appropriate experiment on completion.
const gameInfos = [
  {
    name: 'Experiment A',
    title: 'TR',
    domain: 'Visual Search',
    gameUri: 'practice-tr',
    image: A,
  },
  {
    name: 'Experiment B',
    title: 'EB',
    domain: 'Visual Search',
    gameUri: 'practice-eb',
    image: B,
  },
];

type LandingState = { fromTask?: boolean; ts?: number; next?: string } | null;

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navLock = useRef(false);
  const state = (location.state as LandingState) || null;
  const [nonce, setNonce] = useState<number>(() => state?.ts ?? 0);

  useEffect(() => {
    if (navLock.current) return;

    const calib = getCalibration();
    if (!calib) {
      navLock.current = true;
      navigate('/calibration', { replace: true, state: { next: '/landing' } });
      return;
    }

    if (state?.fromTask) {
      setNonce(state.ts || Date.now());
      navLock.current = true;
      navigate('/landing', { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, navigate]);

  return (
    <div className="h-screen w-full bg-slate-50 relative">
      <div className="row">
        <BreadCrumb />
        <div className="w-full px-6 sm:px-24 py-6 sm:py-36">
          <GameSelectionCard key={nonce} games={gameInfos} />
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
