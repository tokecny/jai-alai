import React, { useEffect, useState } from 'react';

function LoadingSpinner() {
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    }, [])

  return (
    <div id="loading">
        {isLoading ? (
            <div className="loading-panel fixed inset-0 z-50 bg-[rgba(73,73,73,0.4)] flex items-center justify-center">
                <div 
                    className="loader rounded-full bg-gradient-to-r from-pink-400 to-amber-400 animate-spin"
                    style={{
                        position: 'fixed',
                        right: '1.5vw',  // ระยะห่างจากขอบขวา
                        bottom: '1.5vw', // ใช้ค่าเดียวกันกับ right
                        width: '5vw',  // ขนาดตาม viewport
                        height: '5vw', // ขนาดตาม viewport
                        mask: 'radial-gradient(farthest-side,#0000 calc(100% - 1.5vw),#fff 0)',
                        WebkitMask: 'radial-gradient(farthest-side,#0000 calc(100% - 1.5vw),#fff 0)',
                    }} 
                />
            </div>
        ) : null }
    </div>
  )
}

export default LoadingSpinner;
