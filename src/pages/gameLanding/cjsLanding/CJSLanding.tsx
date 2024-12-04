import React, { useEffect } from 'react'
import './CJSLanding.css'
import BreadCrumb from '../../../components/breadcrumbs/breadCrumb'
import CJSWindow from '../../../components/gameWindow/cjsWindow/CJSWindow'
import EnterButtons from '../../.././components/enterButtons/EnterButtons'
import * as vismem from '../../../scripts/vismemCC_simon';

let canvasWidth = 550;
let canvasHeight = 550;
let bgcolor = '#E5E5E5';
let centerX: number;
let centerY: number;
let colors = ['#0072FF', '#FFC837'];
function CJSLanding() {
  useEffect(() => {
    function onMount() {
        createCanvas()
    }
    onMount();
}, [])

function createCanvas() {
    let myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
    let canvasContext = myCanvas.getContext("2d") as CanvasRenderingContext2D;
    centerX = myCanvas.width / 2;
    centerY = myCanvas.height / 2;
    myCanvas.hidden = false;
    vismem.erase(canvasContext);
    vismem.clear();
    makeBackground(bgcolor)
    makeHomeItems();
    vismem.drawObjects(canvasContext, vismem.objects);
}

function makeHomeItems() {
    vismem.makeCircle('c', centerX - 150, centerY, 18, false, 2, colors[0], colors[0])
    vismem.makeCircle('c', centerX - 50, centerY, 18, false, 2, colors[1], colors[1])
    vismem.makeRectangle('s', centerX + 50, centerY, 36, 36, false, colors[0], colors[0])
    vismem.makeRectangle('s', centerX + 150 , centerY, 36, 36, false, colors[1], colors[1])
}

function makeBackground(bgcolor) {
    vismem.makeRectangle('bg', centerX, centerY, canvasWidth, canvasHeight, false, bgcolor, bgcolor);
}

  return (
    <div className='h-screen w-full bg-slate-50'>
        <div className='row'>
              {<BreadCrumb />}
            <div id='w-full px-6 sm:px-12 py-6 sm:py-12'>
              <div className="CJSLandingProgressBar"></div>
              <div className="CJSLandingWindow">
                {<CJSWindow />}
              </div>
              <div className="CJSLandingEnterButton">
                {<EnterButtons />}
              </div>
            </div>
        </div>
    </div>
  )
}

export default CJSLanding