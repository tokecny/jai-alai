import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CJSInstruction.scss';
import BreadCrumb from '../../../components/breadcrumbs/breadCrumb';
import CJSWindow from '../../../components/gameWindow/cjsWindow/CJSWindow';
import CJSButton from '../../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import useSound from 'use-sound';
import clickSoundSrc from '../../../assets/sound/click.mp3';
import combo2SoundSrc from '../../../assets/sound/combo2.mp3';
import losingSoundSrc from '../../../assets/sound/losingStreak.mp3';
import instructionCanvas from '../../../assets/png/canvas.png';
import instructionProgressbar from '../../../assets/png/progressBar.png';
import instructionPerson from '../../../assets/png/instructionPerson.png';
import instructionFinished from '../../../assets/png/instructionFinished.png';
import { Shuffle } from '../../../scripts/shuffle';
import * as vismem from '../../../scripts/vismemCC_simon';

let myCanvas: HTMLCanvasElement;
let canvasContext: CanvasRenderingContext2D;
let progressBarElement: HTMLProgressElement;
let trialNumber = 100;
let currTrial = 0;
let backgroundColor = '#E5E5E5';
let stimulusColor = ['#0072FF', '#FFC837'];
let searchTargetList: any[][] = [
    [
        { description: 'สี่เหลี่ยมสีฟ้า', color: 'blue', shape: 'square' },
        { description: 'สี่เหลี่ยมเหลือง', color: 'yellow', shape: 'square' }
    ],
    [
        { description: 'วงกลมสีฟ้า', color: 'blue', shape: 'circle' },
        { description: 'วงกลมเหลือง', color: 'yellow', shape: 'circle' }
    ]
]
let canvasWidth = 800;
let canvasHeight = 800;
let squareWidth = 55;
let squareHeight = 55;
let radius = squareWidth / 2;
let positionJitter = 8;
let centerX: number;
let centerY: number;
let Xspan = canvasWidth / 2;
let Yspan = canvasHeight / 2;
let XblockNumber = 8;
let YblockNumber = 6;
let Xblock = Xspan * 2 / XblockNumber;
let Yblock = Yspan * 2 / YblockNumber;
let X: number[]
let Y: number[]
let Xs: number[] = [];
let Ys: number[] = [];
let Xtemps: number[] = [];
let Ytemps: number[] = [];
let posId: number[] = [];
let maxSS = Math.floor((XblockNumber * YblockNumber - 1) / 2);
let ceilingSS = 0;
let currSS = 2;
let allSetsizeAndTarget: number[][] = [];
let change = NaN;
let shapeRand = [0, 1];
let ori: number[]
let col: string[]
let oris: number[] = [];
let cols: number[] = [];
let thatRight: string = '';
let responseText: string = '';
let timeoutList: any[] = []; 
let count = 0;
let NupNdown = 1;
let trackRecord = 0;

function CJSInstruction(props) {
    const navigate = useNavigate();
    const [tutorialStep, setTutorialStep] = useState(1);
    const [tutorialTest, setTutorialTest] = useState('');
    const [tutorialHide, setTutorialHide] = useState(false);
    const [tryAgain, setTryAgain] = useState(false);
    const [justWait, setJustWait] = useState(false);
    const [clickSound] = useSound(clickSoundSrc);
    const [combo2Sound] = useSound(combo2SoundSrc);
    const [losingSound] = useSound(losingSoundSrc);
    const [searchTarget, setSearchTarget] = useState<{ shape: number, col: number }>();
    const [progressValue, setProgressValue] = useState(15);
    const [disabledButton, setDisabledButton] = useState(false);

    useEffect(() => {
        initiateData();
        setSearchTarget({ shape: (Math.random() > 0.5 ? 1 : 0), col: (Math.random() > 0.5 ? 1 : 0) });
        createPseudorandomStimuli();

        return() => {
            timeoutList.forEach(tm => {
                clearTimeout(tm);
            })
        };
    }, [])

    useEffect(() => {
        switchSearchMode();
        createTargetCanvas();
    }, [searchTarget])

    function initiateData() {
        currSS = 2;
        ceilingSS = 0;
        count = 0;
        currTrial = 0;
        Xtemps = [];
        Xs = [];
        Ytemps = [];
        Ys = [];
        posId = [];
    }

    function createTargetCanvas() {
        let cv: HTMLCanvasElement = document.getElementById("target-canvas") as HTMLCanvasElement;
        if (cv) {
            let ctx: CanvasRenderingContext2D = cv.getContext("2d") as CanvasRenderingContext2D;
            let xOffset = cv.width / 2;
            if (searchTarget?.col === 1) {
                ctx.strokeStyle = '#FFC837'
                ctx.fillStyle = '#FFC837';
            } else if (searchTarget?.col === 0) {
                ctx.strokeStyle = '#0072FF'
                ctx.fillStyle = '#0072FF';
            }
            if (searchTarget?.shape === 0) {
                ctx.rect(xOffset - 10, cv.height - 21, 20, 20);
            } else if (searchTarget?.shape === 1) {
                ctx.arc(xOffset, cv.height - 11, 10, 0, 2 * Math.PI);
            }
            ctx.stroke();
            ctx.fill();
        }
    }

    function createPseudorandomStimuli() {
        allSetsizeAndTarget = [];
        let allSetsizeRange = [2, 6, 12];
        let trialsPerSetsize = 4; 
        let targetCondition = 2; // target appear or disappear
        let searchMode = 2; // feature or conjunction 
        let trialsPerCondition = trialsPerSetsize / targetCondition; 

        for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
            for (let iRep = 0; iRep < trialsPerCondition; iRep++) {
                for (let iTarget = 0; iTarget < targetCondition; iTarget++) {
                    for (let iMode = 0; iMode < searchMode; iMode++) {
                        allSetsizeAndTarget.push([allSetsizeRange[iSetsize],iTarget,iMode]);
                    }
                }
            }
        }
        Shuffle(allSetsizeAndTarget); 
    }

    function switchSearchMode() {
        if (searchTarget) {
            oris = [];
            cols = [];
            if (allSetsizeAndTarget[currTrial][2] === 0) {
                // feature search
                for (let j = 0; j < maxSS; j++) { oris.push(0); oris.push(0)};
                if (searchTarget.shape === 1) {
                    shapeRand = [1];
                } else {
                    shapeRand = [0];
                }
                if (searchTarget.col === 1) {
                    for (let k = 0; k < maxSS; k++) { cols.push(0); cols.push(0)};
                } else {
                    for (let k = 0; k < maxSS; k++) { cols.push(1); cols.push(1)};
                }
            } else {
                // conjunction search
                for (let j = 0; j < maxSS; j++) { oris.push(0); oris.push(1)};
                for (let k = 0; k < maxSS; k++) { cols.push(0); cols.push(1)};
                if (searchTarget.shape === 1) {
                    shapeRand = [1];
                } 
                else {
                    shapeRand = [0];
                }
                if (searchTarget.col === 1) {
                    for (let k = 0; k < cols.length; k++) { cols[k] = 1 - cols[k] };
                } 
            }
            // if createCanvas() runs before switchSearchMode() the target and distractors position might be overlapped
            if (currTrial === 0){ 
                // create only one time when the game started
                createCanvas();
            }
            initialT(0, allSetsizeAndTarget[currTrial][0]);
        }
    }

    function createCanvas() {
        myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        canvasContext = myCanvas.getContext("2d") as CanvasRenderingContext2D;
        centerX = myCanvas.width / 2;
        centerY = myCanvas.height / 2;

        for (var ix = 0; ix < XblockNumber; ix++) {
            Xtemps.push(Math.round(Xblock / 2) + Xblock * ix - Xspan + centerX)
        }

        for (var iy = 0; iy < YblockNumber; iy++) {
            Ytemps.push(Math.round(Yblock / 2) + Yblock * iy - Yspan + centerY)
        }

        for (ix = 0; ix < XblockNumber; ix++) {
            for (iy = 0; iy < YblockNumber; iy++) {
                Xs.push(Xtemps[ix]);
                Ys.push(Ytemps[iy]);
                posId.push(count);
                count++;
            }
        }
        myCanvas.hidden = false;
    }

    function initialT(_waittime, SS) {
        setDisabledButton(false);
        if (!ceilingSS) {
            ceilingSS = SS + 1;
        };
        vismem.erase(canvasContext);
        vismem.clear();
        shuffleSS(SS);
        makeBackground(backgroundColor);
        makeSearchArray(X, Y, squareWidth, squareHeight, ori, col);
        vismem.drawObjects(canvasContext, vismem.objects);
    }

    function shuffleSS(setSize) {
        Shuffle(posId);
        X = []; for (let ix = 0; ix < setSize + 1; ix++) { X.push(Xs[posId[ix]]) };
        Y = []; for (let iy = 0; iy < setSize + 1; iy++) { Y.push(Ys[posId[iy]]) };
        ori = []; for (let j = 0; j < setSize; j++) { ori.push(oris[j]) };
        col = []; for (let j = 0; j < setSize; j++) { col.push(stimulusColor[cols[j]]) };
        
        // check if this trial is feature or conjunction search
        if (allSetsizeAndTarget[currTrial][2] === 0) {
            // feature search
            // check if the target appears or disappears
            if (allSetsizeAndTarget[currTrial][1] === 0) {
                // disappears
                ori.push(oris[setSize]);
                col.push(stimulusColor[cols[setSize]]);
            } else {
                // appears
                ori.push(1 - oris[setSize]);
                col.push(stimulusColor[1 - cols[setSize]]);
            }
        } else {
            // conjunction search
            // check if the target appears or disappears
            if (allSetsizeAndTarget[currTrial][1] === 0) {
                // disappears
                ori.push(oris[setSize]);
                col.push(stimulusColor[cols[setSize]]);
            } else {
                // appears
                ori.push(1 - oris[setSize]);
                col.push(stimulusColor[cols[setSize]]);
            }
        }
    }

    function makeBackground(backgroundColor) {
        // Fill background
        vismem.makeRectangle('bg', centerX, centerY, canvasWidth, canvasHeight, false, backgroundColor, backgroundColor);
    }
    
    function makeSearchArray(numarrayX, numarrayY, squareWidth, squareHeight, orienVec, colorVec) {
        for (let i = 0; i < orienVec.length; i++) {
            if (orienVec[i] === shapeRand[0]) {
                vismem.makeCircle('c', numarrayX[i] + (Math.random() - 0.5) * 2 * positionJitter, numarrayY[i] + (Math.random() - 0.5) * 2 * positionJitter, radius, false, colorVec[i], colorVec[i]);
            } else {
                vismem.makeRectangle('s', numarrayX[i] + (Math.random() - 0.5) * 2 * positionJitter, numarrayY[i] + (Math.random() - 0.5) * 2 * positionJitter, squareHeight, squareWidth, false, colorVec[i], colorVec[i], 0, 0);
            }
        }
        if (searchTarget) {
            // Find Target from Object
            let find = vismem.objects.find(x => x.id === (searchTarget.shape === 0 ? 's' : 'c') && x.color === stimulusColor[searchTarget.col])
            change = find ? 1 : 0
        }
    }

    function checkResp(foo) {
        // clickSound();

        if (tryAgain === true) {
            setTryAgain(false);
        }

        setJustWait(true); // for prevent double click 'ถัดไป' when ans is correct via 'ใข่' button 
        setTimeout(() => {
            setJustWait(false);
        }, 500);

        if (change === foo) {
                setTutorialTest('right');
                thatRight = 'right';
            // combo2Sound();
            trackRecord = trackRecord + 1;
        } else {
                setTutorialTest('wrong');
                thatRight = 'wrong';
            // losingSound()
            trackRecord = 0;
            setTimeout(() => {
                setTryAgain(true);
            }, 1000);
        }

        if (tutorialStep !== 6) {
            setProgressValue(progressValue + 17);
        }
        trialIsOver();
        instructionControl();
    }

    function trialIsOver() {
        vismem.erase(canvasContext);
        vismem.clear();
        makeBackground(backgroundColor)
        vismem.drawObjects(canvasContext, vismem.objects);
        if (trackRecord >= NupNdown) {
            if (allSetsizeAndTarget[currTrial][0] < maxSS * 2 - 2) {
                // currSS = currSS + 1;
                ceilingSS = allSetsizeAndTarget[currTrial][0] + 1;
            } else {
                ceilingSS = allSetsizeAndTarget[currTrial][0] + 1;
            }
        }

        // different from conjs-trial
        if (trackRecord === 0 && allSetsizeAndTarget[currTrial][0] > 2) {
            allSetsizeAndTarget[currTrial][0] = allSetsizeAndTarget[currTrial][0];
        }

        currTrial = currTrial + 1;
        if (currTrial >= trialNumber) {
            // Done();
        } else {
            trialConclude();
        }
    }

    function trialConclude() {
        setDisabledButton(true);
        vismem.erase(canvasContext);
        vismem.clear();
        makeBackground(backgroundColor);
        vismem.drawObjects(canvasContext, vismem.objects);
        
        let textHeight = 0;
        if (thatRight === 'wrong'){
            responseText = "ผิด";
            textHeight = 36;
        } else {
            responseText = "ถูก";
            textHeight = 20;
        }

        canvasContext.font = "120px Sarabun"
        let textWidth = canvasContext.measureText(responseText).width;
        timeoutList.push(
            setTimeout(function() {
                let text = vismem.makeText('t', centerX - textWidth/2, centerY + textHeight, responseText, "Black", canvasContext.font);
                vismem.drawText(canvasContext, text);
            }, 100),

            setTimeout(function() {
                vismem.erase(canvasContext);
                vismem.clear();
                makeBackground(backgroundColor);
                vismem.drawObjects(canvasContext, vismem.objects);
            }, 600),

            setTimeout(function() {
                switchSearchMode();
            }, 900)
        )
    }

    function instructionControl() {
        if (tutorialStep === 7 && tutorialTest === 'wrong') {
            setTutorialStep(tutorialStep - 1);
            setTutorialTest('');
            setTutorialHide(true);
            createPseudorandomStimuli(); // prevent run out of stimuli cause by keep playing wrong tutorial
        } else {
            setTutorialStep(tutorialStep + 1);
            if (tutorialStep !== 5 && tutorialStep !== 9 
                && tutorialStep !== 10 && tutorialStep !== 11 
                && tutorialStep !== 12 && tutorialStep !== 13) {
                setTutorialHide(false);
            } else {
                setTutorialHide(true);
            }
        } 
    }

    function backToCJSLanding() {
        navigate('/face-in-the-crowd');
    }

    return (
        <div className='card' style={{ alignItems: 'center', placeContent: 'center' }}>
            {tutorialHide === false ?
                <div className="tutorial">
                        <div className={'progressBarContainerInstruction' + (tutorialStep !== 15 ? ' onHide' : '')}>
                            <img src={instructionProgressbar} alt="progressbar" id="instructionProgressbar"></img>       
                        </div>
                    <div className={'instructionContainer' + (tutorialStep === 16 ? ' centered': '')}>
                        <div className="instructionPic"> 
                            <div className={'canvasContainerInstruction' + (tutorialStep !== 3 ? ' onHide' : '')}>
                                {searchTarget ?
                                    <div className='instructionSearchInstruction'>
                                        มี<b className={'search-text ' + searchTargetList[searchTarget.shape][searchTarget.col].color}>  {searchTargetList[searchTarget.shape][searchTarget.col].description}</b>
                                        <span className={'search-img ' + searchTargetList[searchTarget.shape][searchTarget.col].shape + ' ' + searchTargetList[searchTarget.shape][searchTarget.col].color}></span>
                                        หรือไม่?
                                    </div>
                                : null}
                                <img src={instructionCanvas} alt="canvas" id="instructionCanvas"></img>
                            </div> 
                        </div>
                        <div className={'btnContainerInstruction' + (tutorialStep !== 4 ? ' onHide' : '')}>
                            <button id='no-btn' className='btn no-btn circle lg'> ไม่มี </button>
                            <button id='yes-btn' className='btn yes-btn circle lg'> มี </button>
                        </div>
                        <div className="instructionPerson">
                            <img src={instructionPerson} alt="an instruction guy" className={'personStart' + (tutorialStep < 16 ? '': ' onHide')}></img>
                            <img src={instructionFinished} alt="an instruction guy" className={'personEnd' + (tutorialStep === 16 ? '': ' onHide')}></img>
                        </div>
                        <div className="instructionBox">
                            <div className= "instructionText">
                                {tutorialStep === 1 ? <p>สวัสดีครับ วันนี้ผมจะมาสอนวิธี <br></br>เล่นเกม <b>'หากันจนเจอ'</b></p> : null}
                                {tutorialStep === 2 ? <p>เป้าหมายของเกมนี้คือการหา <br></br><b>รูปทรงที่มีสีตามที่กำหนด</b></p> : null}
                                {tutorialStep === 3 && searchTarget ? <p>อย่างเช่นให้คุณหา <b>{searchTargetList[searchTarget.shape][searchTarget.col].description}</b></p> : null}
                                {tutorialStep === 4 ? <p>หากมีให้กดปุ่ม “<b style={{ color : `#26A445`}}>มี</b>”  <br></br>หากไม่มีกดปุ่ม “<b style={{ color : `#E52D27`}}>ไม่มี</b>” <br></br> <i style={{ color : `#808080`}}>กดปุ่ม "ถัดไป" ด้านล่างเพื่อไปต่อ</i> </p> : null}
                                {tutorialStep === 5 ? <p>เรามาลองเล่นกันดูครับ </p> : null}
                                {tutorialStep === 7 && tutorialTest === 'right' ? <p>ถูกต้องครับ! <br></br><br></br>คะแนนเกมนี้ จะขึ้นอยู่กับ <br></br><b>ความถูกต้องและความไว</b></p> : null}
                                {tutorialStep === 7 && tutorialTest === 'wrong' ? <p>อย่าลืมนะครับ ว่าต้องเป็น  <br></br><b>รูปทรงที่มีสีตามที่กำหนด</b></p> : null}
                                {tutorialStep === 8 ? <p>เรามาเล่นอีกที คราวนี้ลองพยายาม<br></br> ตอบให้<b>เร็วและถูกต้องมากที่สุด</b> <br></br>นะครับ</p> : null}
                                {tutorialStep === 9 ? <p>ให้ระวังในแต่ละครั้ง<br></br> ตัวหลอกอาจจะมี<b> "สี"</b> หรือ <b>"รูปทรง"</b> <br></br><b>เหมือนกับเป้าหมาย</b> เพราะฉะนั้น <br></br>ตั้งใจดูด้วยนะครับ</p> : null}
                                {tutorialStep === 15 ? <p>เมื่อแถบนี้เต็ม เกมก็จะจบลง</p> : null}
                                {tutorialStep === 16 ? <p>ยินดีด้วย! คุณได้ผ่านการฝึกเล่น <br></br>เกม <b>'หากันจนเจอ'</b> แล้ว</p> : null}
                            </div>
                            <div className="instructionControl">
                                <div className="instructionBtnBack">
                                {tutorialStep === 1 || tutorialStep === 7 || tutorialStep === 15 ? null : <button className="backInstruction" onMouseDown={() => {setTutorialStep(tutorialStep - 1)}}>{`< ย้อนกลับ`}</button>}
                                </div>
                                <div className="instructionBtnNext">
                                {tutorialStep === 7 && tutorialTest === 'wrong' ? <button disabled={tryAgain === false} className={'nextInstruction'} onMouseDown={() => {instructionControl()}}>{`ลองอีกครั้ง >`}</button> : null}
                                {tutorialStep < 16 ?  
                                    <button disabled={justWait === true} className={'nextInstruction' + (tutorialTest === 'wrong' ? ' onHide' : '')} onMouseDown={() => {instructionControl()}}>{tutorialStep === 5 || tutorialStep === 9 ? `ลองเล่น >` : `ถัดไป >`}</button> :
                                    <button className="nextInstruction" onMouseDown={() => {backToCJSLanding()}}>{`กลับเมนูเกม >`}</button> }    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            : null}
            <div className='row'>
            <div className='py-4 px-12 sm:py-ุ6 w-full bg-blue-100 shadow-md'>
              {<BreadCrumb />}
            </div>
            <div id='CJSInstructionBody'>
                <div className="CJSInstructionBodyProgressBar">
                </div>
                <div className="CJSInstructionWindow">
                    {<CJSWindow searchTarget={searchTarget} searchTargetList={searchTargetList} canvasWidth={canvasWidth} canvasHeight={canvasHeight}/>}
                </div>
                <div className="CJSInstructionEnterButton">
                    {<CJSButton searchTarget={searchTarget} checkResp={checkResp}/>}
                </div>
            </div>
        </div>
        </div>
    )
}
export default CJSInstruction;