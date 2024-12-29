import React, { useEffect } from 'react';
import './CJSButton.scss';

function CJSButton(props) {
  useEffect(() => {
    // ฟังก์ชันตรวจจับการกดแป้นพิมพ์
    function handleKeyDown(event) {
      // ตรวจสอบว่า disabledButton เป็น false
      if (!props.disabledButton) {
        if (event.code === 'KeyZ') {
          // กดตัว z -> ทำงานเหมือนคลิกปุ่ม "ไม่มี"
          props.checkResp(0); // เมื่อกดตัว z
        } else if (event.code === 'Slash') {
          // กดตัว / -> ทำงานเหมือนคลิกปุ่ม "มี"
          props.checkResp(1); // เมื่อกดตัว /
        }
      }
    }
    
    // เพิ่ม event listener สำหรับการกดแป้นพิมพ์
    document.addEventListener('keydown', handleKeyDown);
    
    // ทำความสะอาดเมื่อคอมโพเนนต์ถูกทำลาย
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [props.checkResp, props.disabledButton]);

  return (
    <div>
      {/* ปุ่มจะสามารถกดได้ก็ต่อเมื่อ disabledButton เป็น false */}
      {/* {props.searchTarget && !props.disabledButton ? (
        <div className="btnContainer">
          <button
            id="no-btn"
            disabled={props.disabledButton}
            className="btn no-btn circle lg"
            onMouseDown={() => props.checkResp(0)}  // เมื่อคลิกปุ่ม "ไม่มี"
          >
            ไม่มี
          </button>

          <button
            id="yes-btn"
            disabled={props.disabledButton}
            className="btn yes-btn circle lg"
            onMouseDown={() => props.checkResp(1)}  // เมื่อคลิกปุ่ม "มี"
          >
            มี
          </button>
        </div>
      ) : null} */}
    </div>
  );
}

export default CJSButton;
