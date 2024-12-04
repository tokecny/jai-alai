import React from 'react'
import './EnterButtons.css'
import { useNavigate } from 'react-router-dom';

function EnterButtons() {
  const navigate = useNavigate();

  function selectEnter(mode: string) {
    switch (mode) {
      case 'instruction':
          navigate(`./${mode}`);
          break
      case 'trial':
          navigate(`./${mode}`);
          break;
      default:
          navigate(`./${mode}`);
          break;
    }
  }
  return (
    <div className="enterButtonContainer">
      <div className="rowBtnContainer">
          {/* <button className='enterInstruction' onClick={() => selectEnter('instruction')}> วิธีเล่น </button> */}
      </div>
      <div className="rowSingleBtnContainer">
          <button className='enterGame' onClick={() => selectEnter('trial')}> เริ่มเกม </button>
      </div>
    </div>
  )
}

export default EnterButtons