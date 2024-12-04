import React from 'react';
import './ScoreSummaryOverlay.scss';
import scoreBadge from '../../assets/png/scoreBadge.png';

function ScoreSummaryOverlay(props) {
  return (
    <div className="summary">
      <div className="summaryContainer">
        {props.hardGNGDone ? 
            <div className="summaryHeader">
            <p className='thisScore'>กดถูกต้อง : {Math.round(props.accuracy)} %</p>
            <p className='thisScore'>เผลอกดผิด : {Math.round(props.falseHit)} %</p>
        </div> : 
        <div className="summaryHeader">
            <p className='thisScore'>ตอบถูกทั้งหมด</p>
            <p className='bigScore'>{Math.round(props.accuracy).toLocaleString() + ' %'}</p>
        </div>
        }
          <div className="summaryBadge">
              <img src={scoreBadge} alt='badge' className={'medalBadge'}></img>
              <p className='highestScore'>ความเร็วเฉลี่ย: {(props.avgHitRt).toFixed(2)} วินาที</p>
          </div>
          <div className="btnContainerSummary">
              <button className='summaryBtnPlayAgain' onClick={props.refreshPage}>{}</button>
              <button className='summaryBtnHome' onClick={props.backToLandingPage}>{`กลับหน้าหลัก`}</button>
          </div>
      </div>
  </div>
  )
}

export default ScoreSummaryOverlay;