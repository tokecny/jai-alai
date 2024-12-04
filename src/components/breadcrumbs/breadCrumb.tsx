import { HomeIcon } from '@heroicons/react/20/solid'
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './breadCrumb.css'
import { getDataFromLocalStorage } from '../../uitls/offline';

export default function BreadCrumb() {
  const [headerText, setHeaderText] = useState('');
  const [gameButtonLink, setGameButtonLink] = useState('#/landing');
  const [disableHomeButton, setDisableHomeButton] = useState('');
  const [disableGameButton, setDisableGameButton] = useState('');
  const [hideUserId, setHideUserId] = useState(false);
  const location = useLocation();
  const pathName = location.pathname;
  const id = getDataFromLocalStorage('userId');
  
  let CJSHeaderText = 'หาเธอในฝูงชน';
  let pages = [
    { name: headerText, href: gameButtonLink, current: false },
  ]
  
  useEffect(() => {
    if (pathName === '/landing') {
      setHeaderText('หน้าหลัก');
    } else {
      setHideUserId(true);
      if (pathName.includes('/spatial-span')) {
        // setHeaderText(SSHeaderText);
        setGameButtonLink('#/spatial-span');
      } else if (pathName.includes('/face-in-the-crowd')) {
        setHeaderText(CJSHeaderText);
        setGameButtonLink('#/face-in-the-crowd');
      } else if (pathName.includes('/go-nogo')) {
        // setHeaderText(GNGHeaderText);
        setGameButtonLink('#/go-nogo');
      }
    }

    if (pathName.includes('/instruction') || pathName.includes('/trial')) {
      setDisableHomeButton(' disabled')
      setDisableGameButton(' disabled');
    } 
  }, [])
  
  return (
    <div className='py-4 px-12 sm:py-3 w-full bg-pink-400 shadow-md'>    
      <nav className="flex h-fit justify-between" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-4">
          <li>
            <div>
              <a href={'#/landing'} className={`text-stone-100 hover:text-stone-200 + ${disableHomeButton}`}>
                <HomeIcon className="h-5 w-5 sm:h-8 sm:w-8 flex-shrink-0" aria-hidden="true" />
                <span className="sr-only">Home</span>
              </a>
            </div>
          </li>
          {pages.map((page) => (
            <li key={page.name}>
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 sm:h-8 sm:w-8 flex-shrink-0 text-stone-100"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                <a
                  href={page.href}
                  className={`ml-4 text-sm sm:text-xl font-bold sm:font-bold text-stone-100 + ${disableGameButton}`}
                  aria-current={page.current ? 'page' : undefined}
                >
                  {page.name}
                </a>
              </div>
            </li>
          ))}
        </ol>
        {hideUserId ? null : 
          <ol role="list" className="flex items-center space-x-4">
            <li>
              <a
                className={`ml-4 text-sm sm:text-xl font-bold sm:font-bold text-stone-100 + ${disableGameButton}`}
              >
                {`Subject ID : ` + id}
              </a>
            </li>
            <li>
              <div>
                <a href={''} className={`text-stone-100 hover:text-stone-200 + ${disableHomeButton}`}>
                <ArrowRightOnRectangleIcon className="h-8 w-8 text-stone-100" />
                </a>
              </div>
            </li>
          </ol>
        }
      </nav>
    </div>
  )
}