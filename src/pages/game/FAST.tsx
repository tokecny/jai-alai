import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CJSWindow from '../../components/gameWindow/cjsWindow/CJSWindow';
import useSound from 'use-sound';
import clickSoundSrc from '../../assets/sound/click.mp3';
import combo2SoundSrc from '../../assets/sound/combo2.mp3';
import losingSoundSrc from '../../assets/sound/losingStreak.mp3';
import moment from 'moment';
import { Shuffle } from '../../scripts/shuffle';
import * as vismem from '../../scripts/vismemCC_simon';
import CJSButton from '../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import {saveJSONDataToClientDevice } from '../../uitls/offline';

let myCanvas: HTMLCanvasElement;
let canvasContext: CanvasRenderingContext2D;
let trialNumber;
let currTrial = 0;
let backgroundColor = '#E5E5E5';
let stimulusColor = [
  '#BC4E4E', // แดง (0°)
  '#A6A63F', // เขียวมะกอก (ุ60°)
  '#72CA72', // เขียว (120°)
  '#59C0C0', // ฟ้า (180°)
  '#5959C0', // น้ำเงินอมม่วง (240°)
  '#B946B9', // ม่วงชมพู (300°)
];
let searchTargetList: any[][] = [
    [
        {description: 'สี่เหลี่ยมสีแดง', color: '#BC4E4E', shape: 'square'},
        {description: 'สี่เหลี่ยมสีเขียวมะกอก', color: '#A6A63F', shape: 'square'},
        {description: 'สี่เหลี่ยมสีเขียว', color: '#72CA72', shape: 'square'},
        {description: 'สี่เหลี่ยมสีฟ้า', color: '#59C0C0', shape: 'square'},
        {description: 'สี่เหลี่ยมสีน้ำเงินอมม่วง', color: '#5959C0', shape: 'square'},
        {description: 'สี่เหลี่ยมสีม่วงชมพู', color: '#B946B9', shape: 'square'},
    ],
    [
        {description: 'วงกลมสีแดง', color: '#BC4E4E', shape: 'circle'},
        {description: 'วงกลมสีเขียวมะกอก', color: '#A6A63F', shape: 'circle'},
        {description: 'วงกลมสีเขียว', color: '#72CA72', shape: 'circle'},
        {description: 'วงกลมสีฟ้า', color: '#59C0C0', shape: 'circle'},
        {description: 'วงกลมสีน้ำเงินอมม่วง', color: '#5959C0', shape: 'circle'},
        {description: 'วงกลมสีม่วงชมพู', color: '#B946B9', shape: 'circle'},
    ],
    
]
let canvasWidth = 600;
let canvasHeight = 600;
let squareWidth = 45;
let squareHeight = 45;
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
let currSS = 2;
let initialSetSize = 2; // must have same value as currSS
let baselineSetsizeAndTarget: number[][] = [];
let allTrialPerBlock: number[][] = [];
let testSetsizeAndTarget: number[][] = [];
let allSetsizeAndTarget: number[][] = [];
let change = NaN;
let shapeRand: number[] = [];
let ori: number[]
let col: string[]
let oris: number[] = [];
let cols: number[] = [];
let checkAns: string[] = [];
let thatRight: string = '';
let responseText: string = '';
let countdownText: string = '0';
let timeoutList: any[] = []; 
let count = 0;
let STT;
let ET;
let allRt: number[] = [];
let hitRt: number[] = [];
let correctCount = 0;
let incorrectCount = 0;
let targetMatch: boolean[] = [];
let allStartTime: string[] = [];
let allClickTime: string[] = [];
let allCurrSS: number[] = [];
let trialDataResult: any[] = [];
let stimulusDataResult: any[] = [];
let targetDataResult: any[] = [];
let setSizeRecord: any[] = [];
let allSearchMode: string[] = [];
let version = 'FAST';
let postEntryResult;

function FAST(props): any {
    const navigate = useNavigate();
    const [clickSound] = useSound(clickSoundSrc);
    const [combo2Sound] = useSound(combo2SoundSrc);
    const [losingSound] = useSound(losingSoundSrc);
    const [searchTarget, setSearchTarget] = useState<{ shape: number, col: number }>();
    const [progressValue, setProgressValue] = useState(0);
    const [disabledButton, setDisabledButton] = useState(false);
    const [isItDone, setIsItDone] = useState(false);

        useEffect(() => {
            initiateData();
            createPseudorandomStimuli();
            return() => {
                timeoutList.forEach(tm => {
                    clearTimeout(tm);
                })
            };
        }, [])

        useEffect(() => {
            switchSearchMode();
        }, [searchTarget])

    function initiateData() {
        hitRt = [];
        allRt = [];
        currSS = 2;
        correctCount = 0;
        incorrectCount = 0;
        count = 0;
        currTrial = 0;
        Xtemps = [];
        Xs = [];
        Ytemps = [];
        Ys = [];
        posId = [];
        trialDataResult = [];
    }

    function checkStimuliColorSet(){
        const colorSet = props.userId % 4; 

        // อันที่ถูกต้อง ค่อยมาเปิดใช้งานหลังจากเก็บครบ 16 คน
        if (props.userId % 2 === 0){ // ถ้า userId เป็นเลขคู่
            if (allSetsizeAndTarget[currTrial][3] ===  0) {
                setSearchTarget({ shape: 0, col: colorSet });
            } else {
                setSearchTarget({ shape: 1, col: (colorSet + 1) % 4 });
            }  
        } else { // ถ้า userId เป็นเลขคี่
            if (allSetsizeAndTarget[currTrial][3] ===  0) {
                setSearchTarget({ shape: 1, col: colorSet });
            } else {
                setSearchTarget({ shape: 0, col: (colorSet + 1) % 4 });
            }
        }
    }

    function createPseudorandomStimuli() {
        baselineSetsizeAndTarget = [];
        testSetsizeAndTarget = [];
        allSetsizeAndTarget = [];
        let allSetsizeRange = [31];
        let trialsPerSetsize = 80; 
        let targetCondition = 2; // target appear or disappear
        let trialsPerCondition = trialsPerSetsize / targetCondition; 
        let miniBlocks = 5; // in test blocks 
        let trialsPerBlock = trialsPerSetsize / miniBlocks; // จำนวน trials ต่อ mini-block
        let probabilities = [0.9, 0.7, 0.5, 0.3, 0.1]; // โอกาสการปรากฏของ 1 ในแต่ละ mini-block

        // conjunction search pre-test
        for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
            for (let iRep = 0; iRep < trialsPerCondition; iRep++) {
                for (let iTarget = 0; iTarget < targetCondition; iTarget++) {
                    // baselineSetsizeAndTarget[0][3] คือชุดของสีที่จะใช้
                    baselineSetsizeAndTarget.push([allSetsizeRange[iSetsize], iTarget, 1, 0]);
                    baselineSetsizeAndTarget.push([allSetsizeRange[iSetsize], iTarget, 1, 1]);
                }
            }
        }
        Shuffle(baselineSetsizeAndTarget); 
        // ใส่ baselineSetsizeAndTarget เข้าไปใน allSetsSizeAndTarget
        allSetsizeAndTarget = [...baselineSetsizeAndTarget];

        // conjunction search 5 mini-blocks 
        // ก่อนจะใส่ testSetsizeAndTarget เช็คให้ชัวร์ก่อนว่า allSetsizeAndTarget ไม่ว่างเปล่า
        if (allSetsizeAndTarget.length === baselineSetsizeAndTarget.length) {
            // Block 1 (first 5 mini-blocks)
            probabilities.slice(0, miniBlocks).forEach(probability => {
                allTrialPerBlock = [];
                const targetAppear: number = Math.round(trialsPerBlock * probability); // จำนวนครั้งที่ต้อง push 1
                const targetAbsent: number = trialsPerBlock - targetAppear; // ที่เหลือเป็น 0
                
                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ ExArray
                const ExArray: number[] = Array(targetAppear).fill(1).concat(Array(targetAbsent).fill(0));
                
                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ GFArray
                const GFArray: number[] = Array(targetAppear).fill(0).concat(Array(targetAbsent).fill(1));
                
                for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
                    for (let iTarget = 0; iTarget < ExArray.length; iTarget++) {
                        allTrialPerBlock.push([allSetsizeRange[iSetsize], ExArray[iTarget], 1, 0])
                        allTrialPerBlock.push([allSetsizeRange[iSetsize], GFArray[iTarget], 1, 1])
                    }
                }

                // สุ่มให้คละกัน
                Shuffle(allTrialPerBlock);
                testSetsizeAndTarget.push(...allTrialPerBlock);
            });
            
            // Block 2 (next 5 mini-blocks)
            probabilities.slice(0, miniBlocks).forEach(probability => {
                allTrialPerBlock = [];
                const targetAppear: number = Math.round(trialsPerBlock * probability); // จำนวนครั้งที่ต้อง push 1
                const targetAbsent: number = trialsPerBlock - targetAppear; // ที่เหลือเป็น 0

                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ ExArray
                const ExArray: number[] = Array(targetAppear).fill(0).concat(Array(targetAbsent).fill(1));
    
                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ GFArray
                const GFArray: number[] = Array(targetAppear).fill(1).concat(Array(targetAbsent).fill(0));
    
                for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
                    for (let iTarget = 0; iTarget < ExArray.length; iTarget++) {
                        allTrialPerBlock.push([allSetsizeRange[iSetsize], ExArray[iTarget], 1, 0])
                        allTrialPerBlock.push([allSetsizeRange[iSetsize], GFArray[iTarget], 1, 1])
                    }
                }

                // สุ่มให้คละกัน
                Shuffle(allTrialPerBlock);
                testSetsizeAndTarget.push(...allTrialPerBlock);
            });
            
            // ต่อ testSetsizeAndTarget จาก baselineSetsizeAndTarget ใน allSetsizeAndTarget
            allSetsizeAndTarget.splice(allSetsizeAndTarget.length, 0, ...testSetsizeAndTarget);
        }

        // กำหนดค่า trialNumber ให้เท่ากับจำนวนข้อทั้งหมด
        trialNumber = allSetsizeAndTarget.length;
        checkStimuliColorSet();
    }

    function switchSearchMode() {
        if (searchTarget) {
            oris = [];
            cols = [];
            // conjunction search
            allSearchMode.push('conjunction search');
            for (let j = 0; j < maxSS; j++) { oris.push(0); oris.push(1)};
            if (searchTarget.col === 0) {
                for (let k = 0; k < maxSS; k++) { cols.push(0); cols.push(2)};
            } else if (searchTarget.col === 1) {
                for (let k = 0; k < maxSS; k++) { cols.push(1); cols.push(3)};
            } else if (searchTarget.col === 2) {
                for (let k = 0; k < maxSS; k++) { cols.push(2); cols.push(0)};
            } else if (searchTarget.col === 3) {
                for (let k = 0; k < maxSS; k++) { cols.push(3); cols.push(1)};
            }
            if (searchTarget.shape === 1) {
                shapeRand = [1];
            } else {
                shapeRand = [0];
            }

            // if createCanvas() runs before switchSearchMode() the target and distractors position might be overlapped
            if (currTrial === 0){ 
                // create only one time when the game started
                createCanvas();
            } else if (currTrial === (trialNumber / 3)){
                timeIntervalPerBlock();   
            } else {
                initialT(0, allSetsizeAndTarget[currTrial][0]);
            }

        }
    }
    
    function createCanvas() {
        myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        canvasContext = myCanvas.getContext("2d") as CanvasRenderingContext2D;
        centerX = myCanvas.width / 2;
        centerY = myCanvas.height / 2;

        for (var ix = 0; ix < XblockNumber; ix++) {
            Xtemps.push(Math.round(Xblock / 2) + Xblock * ix - Xspan + centerX);
        }

        for (var iy = 0; iy < YblockNumber; iy++) {
            Ytemps.push(Math.round(Yblock / 2) + Yblock * iy - Yspan + centerY);
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
        timeIntervalPerBlock();
    }

    function initialT(_waittime, SS) {
        setDisabledButton(false);
        setSizeRecord.push(SS);
        vismem.erase(canvasContext);
        vismem.clear();
        allCurrSS.push(allSetsizeAndTarget[currTrial][0]);
        shuffleSS(SS);
        targetData(squareWidth, ori, col);
        makeBackground(backgroundColor);
        makeSearchArray(X, Y, squareWidth, squareHeight, ori, col);
        stimulusData(realX, realY, squareWidth, ori, col);
        vismem.drawObjects(canvasContext, vismem.objects);
        let dT = new Date();
        STT = dT.getTime();
        allStartTime.push(thisTime());
    }

    function shuffleSS(setSize) {
        Shuffle(posId);
        X = []; for (let ix = 0; ix < setSize + 1; ix++) { X.push(Xs[posId[ix]]) };
        Y = []; for (let iy = 0; iy < setSize + 1; iy++) { Y.push(Ys[posId[iy]]) };
        ori = []; for (let j = 0; j < setSize; j++) { ori.push(oris[j]) };
        col = []; for (let j = 0; j < setSize; j++) { col.push(stimulusColor[cols[j]]) };

            // conjunction search
            // check if the target appears or disappears
            if (allSetsizeAndTarget[currTrial][1] === 0) {
                // disappears
                ori.push(oris[setSize]);
                col.push(stimulusColor[cols[setSize]]);
            } else {
                // appears
                if (oris[setSize] === 0) {
                    ori.push(1);
                } else {
                    ori.push(1);
                }

                if (cols[setSize] === 0) {
                    col.push(stimulusColor[2]);
                } else if (cols[setSize] === 1) {
                    col.push(stimulusColor[3]);
                } else if (cols[setSize] === 2) {
                    col.push(stimulusColor[0]);
                } else if (cols[setSize] === 3) {
                    col.push(stimulusColor[1]);
                }
            }
    }

    function makeBackground(backgroundColor) {
        // Fill background
        vismem.makeRectangle('bg', centerX, centerY, canvasWidth, canvasHeight, false, backgroundColor, backgroundColor);
    }

    let realX: number[] = [];
    let realY: number[] = [];
    function makeSearchArray(numarrayX, numarrayY, squareWidth, squareHeight, orienVec, colorVec) {
        for (let i = 0; i < orienVec.length; i++) {
            if (orienVec[i] === shapeRand[0]) {
                vismem.makeCircle('c', numarrayX[i] + (Math.random() - 0.5) * 2 * positionJitter, numarrayY[i] + (Math.random() - 0.5) * 2 * positionJitter, radius, false, colorVec[i], colorVec[i]);
            } else {
                vismem.makeRectangle('s', numarrayX[i] + (Math.random() - 0.5) * 2 * positionJitter, numarrayY[i] + (Math.random() - 0.5) * 2 * positionJitter, squareHeight, squareWidth, false, colorVec[i], colorVec[i], 0, 0);
            }
            realX.push(numarrayX[i] + (Math.random() - 0.5) * 2 * positionJitter);
            realY.push(numarrayY[i] + (Math.random() - 0.5) * 2 * positionJitter);
        }
        if (searchTarget) {
            // Find Target from Object
            let find = vismem.objects.find(x => x.id === (searchTarget.shape === 0 ? 's' : 'c') && x.color === stimulusColor[searchTarget.col])
            change = find ? 1 : 0
            targetMatch.push(find ? true : false);
        }
    }
    
    function targetData(width, ori, col) {
        let thisShape = "";
        let thisParameterName = "";
        let thisValue = 0;
        let obj_in_trial: any[] = [];
        let obj_to_append;
        if (shapeRand[0] === 1) {
            thisShape = "circle";
                thisParameterName = "radius";
                thisValue = radius;
            } else {
                thisShape = "square";
                thisParameterName = "width";
                thisValue = width;
            }

            if (searchTarget) {
                obj_to_append = {
                    "shape" : thisShape,
                    "shapeParams" : {
                        "parameterName" : thisParameterName,
                        "value" : thisValue,
                        "unit" : "px"
                    },
                    "color" : stimulusColor[searchTarget.col]
                }
                obj_in_trial.push(obj_to_append);
            }
        targetDataResult = obj_in_trial[obj_in_trial.length - 1];
        return targetDataResult;
    }

    function stimulusData(x, y, width, ori, col) {
        let thisShape = "";
        let thisParameterName = "";
        let thisValue = 0;
        let obj_in_trial: any[] = [];
        
        for (let i = 0; i < col.length; i++){
            let obj_to_append;
            if (ori[i] === shapeRand[0]) {
                thisShape = "circle";
                thisParameterName = "radius";
                thisValue = radius;
            } else {
                thisShape = "square";
                thisParameterName = "width";
                thisValue = width;
            }
                obj_to_append = {
                "type" : "distractor",
                "display" : {
                    "shape" : thisShape,
                    "shapeParams" : {
                        "parameterName" : thisParameterName,
                        "value" : thisValue,
                        "unit" : "px"
                    },
                    "color" : col[i]
                },
                "position" : {
                    "x" : {
                        "value" : x[i],
                        "unit" : "px"
                    },
                    "y" : {
                        "value" : y[i],
                        "unit" : "px"
                    }
                }
            }   
            obj_in_trial.push(obj_to_append);
        }
        obj_in_trial[obj_in_trial.length - 1].type = "target";
        stimulusDataResult.push(obj_in_trial);
        return stimulusDataResult;
    }

    function trialData(targetMatch, allStartTime, allCurrSS, allClickTime, checkAns, stimulusDataResult, allSearchMode){
        let thisAns;
        let obj_in_trial: any[] = [];
        for (let i = 0; i < targetMatch.length; i++){
            let obj_to_append;
            if (checkAns[i] === 'right' || checkAns[i] === 'late'){
                thisAns = true;
            } else {
                thisAns = false;
            }
            obj_to_append = {
                "hasTarget" : targetMatch[i],
                "startTime" : allStartTime[i],
                "setSize" : allCurrSS[i] + 1,
                "answerTime" : allClickTime[i],
                "answerBool" : thisAns,
                "stimulusData" : stimulusDataResult[i],
                "mode" : allSearchMode[i]
            }
            obj_in_trial.push(obj_to_append);
        }
        trialDataResult.push(obj_in_trial[obj_in_trial.length - 1]);
        return trialDataResult;
    }
    
    function checkResp(foo) {
        // clickSound();
        let dT2 = new Date();
        ET = dT2.getTime();
        allClickTime.push(thisTime());
        let rt = ET - STT;
        allRt.push(rt);
        if (change === foo) {
            // combo2Sound();
            thatRight = 'right';
            checkAns.push(thatRight);
            hitRt.push(rt);
            correctCount++;
        } else {
            // losingSound();
            thatRight = 'wrong';
            checkAns.push(thatRight);
            incorrectCount++;
        }

        trialDataResult = trialData(targetMatch, allStartTime, allCurrSS, allClickTime, checkAns, stimulusDataResult, allSearchMode);
        trialIsOver();
    }

    function trialIsOver() {
        vismem.erase(canvasContext);
        vismem.clear();
        makeBackground(backgroundColor)
        vismem.drawObjects(canvasContext, vismem.objects);

        currTrial = currTrial + 1;
        if (currTrial >= trialNumber) {
            Done();
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
                checkStimuliColorSet();
            }, 900)
        )
    }

    function timeIntervalPerBlock() {
        setDisabledButton(true);
        vismem.erase(canvasContext);
        vismem.clear();
        makeBackground(backgroundColor);
        vismem.drawObjects(canvasContext, vismem.objects);
        
        // ทำเพื่อให้ textWidth คำนวนค่าได้ก่อนที่ 3 2 1 จะขึ้น
        timeoutList.push(
            setTimeout(function() {
                countdownText = '0';
            }, 100) 
        )

        let textHeight = 36;
        canvasContext.font = "120px Sarabun"
        let textWidth = canvasContext.measureText(countdownText).width;
        
        timeoutList.push(
            setTimeout(function() {
                countdownText = '3';
                let text = vismem.makeText('t', centerX - textWidth/2, centerY + textHeight, countdownText, "Black", canvasContext.font);
                vismem.drawText(canvasContext, text);
            }, 200) 
        )

        timeoutList.push(
            setTimeout(function() {
                vismem.erase(canvasContext);
                vismem.clear();
                makeBackground(backgroundColor);
                vismem.drawObjects(canvasContext, vismem.objects);
            }, 900)
        )
    
        timeoutList.push(
            setTimeout(function() {
                countdownText = '2';
                let text = vismem.makeText('t', centerX - textWidth/2, centerY + textHeight, countdownText, "Black", canvasContext.font);
                vismem.drawText(canvasContext, text);
            }, 1200)
        )

        timeoutList.push(
            setTimeout(function() {
                vismem.erase(canvasContext);
                vismem.clear();
                makeBackground(backgroundColor);
                vismem.drawObjects(canvasContext, vismem.objects);
            }, 1900)
        )
    
        timeoutList.push(
            setTimeout(function() {
                countdownText = '1';
                let text = vismem.makeText('t', centerX - textWidth/2, centerY + textHeight, countdownText, "Black", canvasContext.font);
                vismem.drawText(canvasContext, text);
            }, 2200)
        )

        timeoutList.push(
            setTimeout(function() {
                vismem.erase(canvasContext);
                vismem.clear();
                makeBackground(backgroundColor);
                vismem.drawObjects(canvasContext, vismem.objects);
            }, 2900)
        )
    
        timeoutList.push(
            setTimeout(function() {
                initialT(0, allSetsizeAndTarget[currTrial][0]);
            }, 3200) 
        )
    }

    function Done() {
        setIsItDone(true);
        postEntryResult = postEntry();
        console.log(postEntryResult)
        saveJSONDataToClientDevice(postEntryResult, `Subject${props.userId}_${version}_${thisTime().toString()}`);
        backToLanding();
    }

    function postEntry(){
        postEntryResult = {
            "date" : `${thisTime().toString()}`,
            "userId" : props.userId,
            "userSession" : version,
            "target" : targetDataResult,
            "trialData" : trialDataResult,
            "stimuliData": stimulusDataResult,
        }
        return postEntryResult;
    }

    function backToLanding() {
        navigate('/landing');
    }

    return (
        <div className='h-screen w-full bg-slate-50 flex flex-col'>
            <div className='flex justify-center items-center flex-grow p-5'>
                {<CJSWindow searchTarget={searchTarget} searchTargetList={searchTargetList} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />}
                {<CJSButton searchTarget={searchTarget} disabledButton={disabledButton} checkResp={checkResp}/>}
            </div>
        </div>
    )
}

export default FAST;

function thisTime() {
    let thisTime = moment().format('YYYY-MM-DDTkk:mm:ss.SSSSSS');
    return thisTime;
}