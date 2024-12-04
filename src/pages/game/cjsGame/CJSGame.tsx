import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CJSGame.css';
import CJSWindow from '../../../components/gameWindow/cjsWindow/CJSWindow';
import useSound from 'use-sound';
import clickSoundSrc from '../../../assets/sound/click.mp3';
import combo2SoundSrc from '../../../assets/sound/combo2.mp3';
import losingSoundSrc from '../../../assets/sound/losingStreak.mp3';
import moment from 'moment';
import { Shuffle } from '../../../scripts/shuffle';
import * as vismem from '../../../scripts/vismemCC_simon';
import CJSButton from '../../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import { saveCSVDataToClientDevice, saveJSONDataToClientDevice } from '../../../uitls/offline';
import axios from 'axios';

let myCanvas: HTMLCanvasElement;
let canvasContext: CanvasRenderingContext2D;
let trialNumber;
let currTrial = 0;
let backgroundColor = '#E5E5E5';
let stimulusColor = ['#9370DB', '#3CB4C6', '#B2D33D', '#F67E4B']; 
let searchTargetList: any[][] = [
    [
        {description: 'สี่เหลี่ยมสีม่วง', color: '#9370DB', shape: 'square'},
        {description: 'สี่เหลี่ยมสีฟ้า', color: '#3CB4C6', shape: 'square'},
        {description: 'สี่เหลี่ยมสีเขียว', color: '#B2D33D', shape: 'square'},
        {description: 'สี่เหลี่ยมสีส้ม', color: '#F67E4B', shape: 'square'},
    ],
    [
        {description: 'วงกลมสีม่วง', color: '#9370DB', shape: 'circle'},
        {description: 'วงกลมสีฟ้า', color: '#3CB4C6', shape: 'circle'},
        {description: 'วงกลมสีเขียว', color: '#B2D33D', shape: 'circle'},
        {description: 'วงกลมสีส้ม', color: '#F67E4B', shape: 'circle'}
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
let ceilingSS = 0;
let currSS = 2;
let initialSetSize = 2; // must have same value as currSS
let preTestSetsizeAndTarget: number[][] = [];
let postTestSetsizeAndTarget: number[][] = [];
let middleSetsizeAndTarget: number[][] = [];
let allSetsizeAndTarget: number[][] = [];
let change = NaN;
let shapeRand: number[] = [];
let ori: number[]
let col: string[]
let oris: number[] = [];
let cols: number[] = [];
let ceilingTimeLimit = 10 * 1000;
// let timeLimit = 10 * 1000;
let timeLimitDeclineStep = 1000;
let timeLimitInclineStep = 500;
let checkAns: string[] = [];
let thatRight: string = '';
let responseText: string = '';
let countdownText: string = '0';
let timeoutList: any[] = []; 
let count = 0;
let NupNdown = 5;
let trackRecord = 0;
let levelUpCount = 0;
let STT;
let ET;
let sumRt = 0;
let allRt: number[] = [];
let sumHitRt;
let hitRt: number[] = [];
let latestHitRtIndex = 0;
let correctButLateCount = 0;
let lateMultiplier = 10000;
let incorrectCount = 0;
let incorrectMultiplier = 20000;
let scorePerTrial = [0];
let sumScores = 0;
let scoresMultiplier = 10;
let comboCount: number[] = [];
let rtBound = 10000;
let avgHitRt;
let swiftness: string = '';
let total: number = 0;
let score: number;
let targetMatch: boolean[] = [];
let allStartTime: string[] = [];
let allClickTime: string[] = [];
let allCurrSS: number[] = [];
let gameLogicSchemeResult;
let summaryDataResult: any[] = [];
let trialDataResult: any[] = [];
let stimulusDataResult: any[] = [];
let targetDataResult: any[] = [];
let scoringDataResult: any[] = [];
let timeLimitRecord: any[] = [];
let setSizeRecord: any[] = [];
let setSizeInCorrectAns: any[] = [];
let metricDataResult: any[] = [];
let allSearchMode: string[] = [];
let version = '';
let postEntryResult;

function CJSGame(props): any {
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
            checkStimuliColorSet();
            createPseudorandomStimuli();
            // gameLogicSchemeResult = gameLogicScheme(trialNumber, backgroundColor, squareWidth, radius, stimulusColor, positionJitter, XblockNumber, YblockNumber, canvasHeight, canvasWidth);
            return() => {
                timeoutList.forEach(tm => {
                    clearTimeout(tm);
                })
            };
        }, [])

        useEffect(() => {
            switchSearchMode();
        }, [searchTarget])

    // function gameLogicScheme(trialNumber, backgroundColor, squareWidth, radius, stimulusColor, positionJitter, XblockNumber, YblockNumber, canvasHeight, canvasWidth){
    //     gameLogicSchemeResult = {
    //         "game" : "face-in-the-crowd ",
    //         "schemeName" : "default",
    //         "version" : "1.0",
    //         "variant" : "main",
    //         "parameters" : {
    //             "trialNumber": {
    //                 "value" : trialNumber,
    //                 "unit" : null,
    //                 "description" : "Total number of trials"
    //             },
    //             "backgroundColor": {
    //                 "value": backgroundColor,
    //                 "unit": null,
    //                 "description" : "Background color of test canvas"
    //             },
    //             "stimulusShape" : {
    //                 "value" : [
    //                     {
    //                         "shapeName": "square",
    //                         "parameters": {
    //                             "squareWidth" : {
    //                                 "value": squareWidth,
    //                                 "unit": "px",
    //                                 "description" : "Square stimulus width"
    //                             }
    //                         },
    //                         "description" : "Square stimulus"
    //                     }, 
    //                     {
    //                         "shapeName": "circle",
    //                         "parameters": {
    //                             "radius" : {
    //                                 "value": radius,
    //                                 "unit": "px",
    //                                 "description" : "Circle stimulus radius"
    //                             }
    //                         },
    //                         "description" : "Circle stimulus"
    //                     }
    //                 ],
    //                 "unit" : null,
    //                 "description" : "Set of possible stimulus shape"
    //             },
    //             "stimulusColor": {
    //                 "value" : stimulusColor,
    //                 "unit" : null,
    //                 "description" : "Set of possible stimulus color"
    //             },
    //             "positionJitter" : {
    //                 "value": positionJitter,
    //                 "unit": "px",
    //                 "description": "Amplitude of spatial jittering in each axis"
    //             },
    //             "XblockNumber": {
    //                 "value": XblockNumber,
    //                 "unit": null,
    //                 "description": "Number of horizontal blocks composing the canvas"
    //             },
    //             "YblockNumber": {
    //                 "value": YblockNumber,
    //                 "unit": null,
    //                 "description": "Number of vertical blocks composing the canvas"
    //             },
    //             "canvasProperty" : {
    //                 "canvasHeight" : {
    //                     "value" : canvasHeight,
    //                     "unit" : "px",
    //                     "description" : "Height of canvas"
    //                 },
    //                 "canvasWidth" : {
    //                     "value" : canvasWidth,
    //                     "unit" : "px",
    //                     "description" : "Width of canvas"
    //                 }
    //             },
    //         },
    //         "description" : "face-in-the-crowd-1.0 search default scheme"
    //     }
    //     return gameLogicSchemeResult;
    // }

    function initiateData() {
        hitRt = [];
        allRt = [];
        currSS = 2;
        ceilingSS = 0;
        latestHitRtIndex = 0;
        comboCount = [];
        correctButLateCount = 0;
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
        if (props.userId % 2 === 0){ // ถ้า userId เป็นเลขคู่
            if (window.location.href.includes('face-in-the-crowd-A')){
                setSearchTarget({ shape: 0, col: colorSet });
            } else if (window.location.href.includes('face-in-the-crowd-B')){
                setSearchTarget({ shape: 1, col: (colorSet + 1) % 4 });
            }
            
        } else { // ถ้า userId เป็นเลขคี่
            if (window.location.href.includes('face-in-the-crowd-A')){
                setSearchTarget({ shape: 1, col: colorSet });
            } else if (window.location.href.includes('face-in-the-crowd-B')) {
                setSearchTarget({ shape: 0, col: (colorSet + 1) % 4  });
            }
        }
    }

    function createPseudorandomStimuli() {
        preTestSetsizeAndTarget = [];
        postTestSetsizeAndTarget = [];
        middleSetsizeAndTarget = [];
        allSetsizeAndTarget = [];
        let allSetsizeRange = [31];
        let trialsPerSetsize = 60; 
        let targetCondition = 2; // target appear or disappear
        let trialsPerCondition = trialsPerSetsize / targetCondition; 
        let miniBlocks = 5; // in middle blocks 
        let trialsPerBlock = trialsPerSetsize * 2 / miniBlocks; // จำนวน trials ต่อ mini-block
        let probabilities = [0.9, 0.7, 0.5, 0.3, 0.1]; // โอกาสการปรากฏของ 1 ในแต่ละ mini-block

        // conjunction search pre-test and post-test
        for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
            for (let iRep = 0; iRep < trialsPerCondition; iRep++) {
                for (let iTarget = 0; iTarget < targetCondition; iTarget++) {
                    preTestSetsizeAndTarget.push([allSetsizeRange[iSetsize], iTarget, 1]);
                    postTestSetsizeAndTarget.push([allSetsizeRange[iSetsize], iTarget, 1]);
                }
            }
        }
        Shuffle(preTestSetsizeAndTarget); 
        Shuffle(postTestSetsizeAndTarget); 

        // รวม preTestSetsizeAndTarget กับ postTestSetsizeAndTarget เข้าด้วยกัน
        allSetsizeAndTarget = [...preTestSetsizeAndTarget, ...postTestSetsizeAndTarget];

        if (window.location.href.includes('face-in-the-crowd-A')){
            probabilities = [0.9, 0.7, 0.5, 0.3, 0.1];
        } else {
            probabilities.reverse();
        }

        // feature search + conjunction search 6 mini-blocks 
        // ก่อนจะแทรก middleSetsizeAndTarget เช็คให้ชัวร์ก่อนว่า allSetsizeAndTarget มีครบทั้ง pre และ post-test
        if (allSetsizeAndTarget.length === preTestSetsizeAndTarget.length + postTestSetsizeAndTarget.length) {
            probabilities.slice(0, miniBlocks).forEach(probability => {
                const targetAppear: number = Math.round(trialsPerBlock * probability); // จำนวนครั้งที่ต้อง push 1
                const targetAbsent: number = trialsPerBlock - targetAppear; // ที่เหลือเป็น 0
    
                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ feature search
                const featureArray: number[] = Array(targetAppear).fill(1).concat(Array(targetAbsent).fill(0));
    
                // สร้าง array ที่มี 1 และ 0 ตามจำนวนที่คำนวณ ของ conjunction search (0 และ 1 อย่างละครึ่ง)
                // const conjunctionArray: number[] = Array(trialsPerBlock / 2).fill(0).concat(Array(trialsPerBlock / 2).fill(1));
    
                // สุ่มให้คละกัน
                Shuffle(featureArray)
                // Shuffle(conjunctionArray)
    
                for (let iSetsize = 0; iSetsize < allSetsizeRange.length; iSetsize++) {
                    for (let iTarget = 0; iTarget < featureArray.length; iTarget++) {
                        middleSetsizeAndTarget.push([allSetsizeRange[iSetsize], featureArray[iTarget], 0])
                    }
    
                    // for (let iTarget = 0; iTarget < conjunctionArray.length; iTarget++) {
                    //     middleSetsizeAndTarget.push([allSetsizeRange[iSetsize], conjunctionArray[iTarget], 1])
                    // }
    
                }
            });
            
            // หา index ตรงกลางของ allSetsizeAndTarget เพื่อแทรก middleSetsizeAndTarget เข้าไป
            const middleIndex = Math.floor(allSetsizeAndTarget.length / 2); // ตำแหน่งกลางของ array
            allSetsizeAndTarget.splice(middleIndex, 0, ...middleSetsizeAndTarget)
        }

        // กำหนดค่า trialNumber ให้เท่ากับจำนวนข้อทั้งหมด
        trialNumber = allSetsizeAndTarget.length;
        console.log(trialNumber)
        console.log(allSetsizeAndTarget)
    }

    function switchSearchMode() {
        if (searchTarget) {
            oris = [];
            cols = [];
            if (allSetsizeAndTarget[currTrial][2] === 0) {
                // feature search
                allSearchMode.push('feature search');
                for (let j = 0; j < maxSS; j++) { oris.push(0); oris.push(0)};
                if (searchTarget.shape === 1) {
                    shapeRand = [1];
                } else {
                    shapeRand = [0];
                }
                if (searchTarget.col === 0) {
                    for (let k = 0; k < maxSS; k++) { cols.push(2); cols.push(2)};
                } else if (searchTarget.col === 1) {
                    for (let k = 0; k < maxSS; k++) { cols.push(3); cols.push(3)};
                } else if (searchTarget.col === 2) {
                    for (let k = 0; k < maxSS; k++) { cols.push(0); cols.push(0)};
                } else if (searchTarget.col === 3) {
                    for (let k = 0; k < maxSS; k++) { cols.push(1); cols.push(1)};
                }
            } else {
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
                } 
                else {
                    shapeRand = [0];
                }
            }

            // if createCanvas() runs before switchSearchMode() the target and distractors position might be overlapped
            if (currTrial === 0){ 
                // create only one time when the game started
                createCanvas();
            } else if (currTrial === trialNumber / 4 || currTrial === trialNumber / 4 * 3){
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
        // timeLimitRecord.push(timeLimit);
        if (!ceilingSS) {
            ceilingSS = SS + 1;
        };
        vismem.erase(canvasContext);
        vismem.clear();
        allCurrSS.push(allSetsizeAndTarget[currTrial][0]);
        shuffleSS(SS);
        targetData(squareWidth, ori, col);
        makeBackground(backgroundColor);
        makeSearchArray(X, Y, squareWidth, squareHeight, ori, col);
        // stimulusData(realX, realY, squareWidth, ori, col);
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
        } else {
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

    // function stimulusData(x, y, width, ori, col) {
    //     let thisShape = "";
    //     let thisParameterName = "";
    //     let thisValue = 0;
    //     let obj_in_trial: any[] = [];
        
    //     for (let i = 0; i < col.length; i++){
    //         let obj_to_append;
    //         if (ori[i] === shapeRand[0]) {
    //             thisShape = "circle";
    //             thisParameterName = "radius";
    //             thisValue = radius;
    //         } else {
    //             thisShape = "square";
    //             thisParameterName = "width";
    //             thisValue = width;
    //         }
    //             obj_to_append = {
    //             "type" : "distractor",
    //             "display" : {
    //                 "shape" : thisShape,
    //                 "shapeParams" : {
    //                     "parameterName" : thisParameterName,
    //                     "value" : thisValue,
    //                     "unit" : "px"
    //                 },
    //                 "color" : col[i]
    //             },
    //             "position" : {
    //                 "x" : {
    //                     "value" : x[i],
    //                     "unit" : "px"
    //                 },
    //                 "y" : {
    //                     "value" : y[i],
    //                     "unit" : "px"
    //                 }
    //             }
    //         }   
    //         obj_in_trial.push(obj_to_append);
    //     }
    //     obj_in_trial[obj_in_trial.length - 1].type = "target";
    //     stimulusDataResult.push(obj_in_trial);
    //     return stimulusDataResult;
    // }

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
                "hasTargetAnswerBool" : thisAns,
                "stimulusData" : stimulusDataResult[i],
                "mode" : allSearchMode[i]
            }
            obj_in_trial.push(obj_to_append);
        }
        trialDataResult.push(obj_in_trial[obj_in_trial.length - 1]);
        return trialDataResult;
    }
    
    function checkResp(foo) {
        setProgressValue(progressValue + 1);
        clickSound();
        let dT2 = new Date();
        ET = dT2.getTime();
        allClickTime.push(thisTime());
        let rt = ET - STT;
        allRt.push(rt);
        if (change === foo) {
            combo2Sound();
            // if (rt < timeLimit) {
                trackRecord = trackRecord + 1;
                thatRight = 'right';
                checkAns.push(thatRight);
                hitRt.push(rt);
                if (levelUpCount === 0) {
                    comboCount.push(0);
                } else if (levelUpCount === 1) {
                    comboCount.push(1);
                } else if (levelUpCount === 2) {
                    comboCount.push(2);
                } else if (levelUpCount === 3) {
                    comboCount.push(3);
                } else if (levelUpCount === 4) {
                    comboCount.push(4);
                } else if (levelUpCount === 5) {
                    comboCount.push(5);
                }
            // } else {
            //     combo2Sound();
            //     thatRight = 'late';
            //     trackRecord = 0;
            //     checkAns.push(thatRight);
            //     correctButLateCount++;
            // }

        } else {
            losingSound();
            thatRight = 'wrong';
            trackRecord = 0;
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
        if (trackRecord >= NupNdown) {
            if (allSetsizeAndTarget[currTrial][0] < maxSS * 2 - 2) {
                ceilingSS = allSetsizeAndTarget[currTrial][0] + 1;
                if (levelUpCount === 5) {
                    levelUpCount = 5;
                } else {
                    levelUpCount++
                }
            } else {
                ceilingSS = allSetsizeAndTarget[currTrial][0] + 1;
                // timeLimit = timeLimit - timeLimitDeclineStep;
            }
        }

        // if (trackRecord === 0 && allSetsizeAndTarget[currTrial][0] > 4) {
        //     timeLimit = timeLimit + timeLimitInclineStep;
        //     if (timeLimit > ceilingTimeLimit) {
        //         timeLimit = ceilingTimeLimit;
        //     }
        // }
        currTrial = currTrial + 1;
        if (currTrial >= trialNumber) {
            // summaryScore();
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
                switchSearchMode();
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

    // function summaryScore() {
    //     for (let correctIndex = latestHitRtIndex; correctIndex < comboCount.length; correctIndex++) {
    //         latestHitRtIndex = correctIndex;
    //         let rtScore = rtBound - hitRt[correctIndex];
    //         let comboMultiplier = 0;
    //         if (comboCount[correctIndex] === 0) {
    //             comboMultiplier = 1;
    //         } else if (comboCount[correctIndex] === 1) {
    //             comboMultiplier = 1.05;
    //         } else if (comboCount[correctIndex] === 2) {
    //             comboMultiplier = 1.10;
    //         } else if (comboCount[correctIndex] === 3) {
    //             comboMultiplier = 1.20;
    //         } else if (comboCount[correctIndex] === 4) {
    //             comboMultiplier = 1.50;
    //         } else if (comboCount[correctIndex] === 5) {
    //             comboMultiplier = 2.00;
    //         }
    //         rtScore *= comboMultiplier;
    //         scorePerTrial.push(rtScore);
    //     }
    //     sumScores = scorePerTrial.reduce((sum, score) => {
    //         return sum + score;
    //     });

    //     sumRt = allRt.reduce((sum, scores) => {
    //         return sum + scores;
    //     });

    //     if (hitRt.length !== 0){
    //         sumHitRt = hitRt.reduce((sum, score) => {
    //             return sum + score;
    //         });
    //     } else {
    //         hitRt.push(0);
    //         sumHitRt = hitRt;
    //     }

    //     avgHitRt = sumHitRt / 1000 / hitRt.length;
    //     if (avgHitRt < 1) {
    //         swiftness = "เร็วมาก";
    //     }
    //     else if (avgHitRt < 2) {
    //         swiftness = "เร็ว";
    //     }
    //     else {
    //         swiftness = "ปานกลาง";
    //     }

    //     total = Math.max(10000, Math.round((sumScores - (incorrectCount * incorrectMultiplier + correctButLateCount * lateMultiplier)) * scoresMultiplier / trialNumber));

    //     return total;
    // }

    function Done() {
        if (window.location.href.includes('face-in-the-crowd-A')){
            version = 'face-in-the-crowd-A-1.0';
        } else {
            version = 'face-in-the-crowd-B-1.0';
        }
        setIsItDone(true);
        score = total;
        // scoringDataResult = scoringData(rtBound, incorrectMultiplier, lateMultiplier, scoresMultiplier, trialNumber, total);
        // metricDataResult = metricData(trialNumber, incorrectCount, correctButLateCount, hitRt, avgHitRt, swiftness);
        // postEntryResult = postEntry(targetDataResult, trialDataResult, gameLogicSchemeResult, scoringDataResult, metricDataResult);
        // axios.post('https://exercise-vercel-svelte-backend.vercel.app/api/hard/conjunction_search', postEntryResult)
        //     .then(function (postEntryResult) {
        //         console.log(postEntryResult)
        //     })
        //     .catch(function (error) {
        //         console.log('error')
        //     });
        postEntryResult = postEntry();
        console.log(postEntryResult)
        saveJSONDataToClientDevice(postEntryResult, `Subject${props.userId}_${version}_${thisTime().toString()}`);
        backToLanding();
    }

    // function scoringData(rtBound, incorrectMultiplier, lateMultiplier, scoresMultiplier, trialNumber, total){
    //     scoringDataResult = [{
    //         "scoringModel" : {
    //             "scoringName" : "default",
    //             "parameters" : {
    //                 "rtBound" : {
    //                     "value" : rtBound,
    //                     "unit" : null,
    //                     "description" : "rtBound - hitRt = rtScore"
    //                 },
    //                 "incorrectMultiplier" : {
    //                     "value" : incorrectMultiplier,
    //                     "unit" : null,
    //                     "description" : "Multiplier for incorrectCount"
    //                 },
    //                 "lateMultiplier" : {
    //                     "value" : lateMultiplier,
    //                     "unit" : null,
    //                     "description" : "Multiplier for correctButLateCount"
    //                 },
    //                 "scoresMultiplier" : {
    //                     "value" : scoresMultiplier,
    //                     "unit" : null,
    //                     "description" : "Multiplier for total score"
    //                 },
    //                 "trialNumber" : {
    //                     "value" : trialNumber,
    //                     "unit" : null,
    //                     "description" : "Total number of trials"
    //                 }
    //             },
    //             "description" : `score = (sumScores - (incorrectCount * incorrectMultiplier + correctButLateCount * lateMultiplier)) * scoresMultiplier / trialNumber; comboMultiplier depends on comboCount if comboCount = [0, 1, 2, 3, 4, 5] -> comboMultiplier = [1, 1.05, 1.10, 1.20, 1.50, 2]`
    //         },
    //         "score" : total
    //     }]
    //     return scoringDataResult;
    // }

    // function metricData(trialNumber, incorrectCount, correctButLateCount, hitRt, avgHitRt, swiftness){
    //     timeLimitRecord.sort((a,b) => a-b);
    //     hitRt.sort((a,b) => a-b);
    //     let metricName 
    //         = ['correctCount', 
    //            'incorrectCount', 
    //            'correctButLateCount',  
    //            'fastestHitReactionTime', 
    //            'averageHitReactionTime', 
    //            'swiftness',];
    //     let metricValue 
    //         = [trialNumber - incorrectCount, 
    //            incorrectCount, 
    //            correctButLateCount, 
    //            hitRt[0], 
    //            avgHitRt, 
    //            swiftness,];
    //     let metricUnit = [null, null, null, 'ms', 's', null,];
    //     let metricDescription 
    //         = ['Total number of correct trials', 
    //            'Total number of incorrect trials', 
    //            'Total number of correct but late trials', 
    //            'The fastest hit reaction time that user reached', 
    //            'The average of all hit reaction time', 
    //            'The quality of all hit reaction time',];
    //     for (let i = 0; i < metricName.length; i++){
    //         let obj_to_append
    //         obj_to_append = {
    //             "metricName" : metricName[i],
    //             "value" : metricValue[i],
    //             "unit" : metricUnit[i],
    //             "description" : metricDescription[i]
    //         }
    //         metricDataResult.push(obj_to_append);
    //     }    
    //     return metricDataResult;
    // }

    // function postEntry(targetDataResult, trialDataResult, gameLogicSchemeResult, scoringDataResult, metricDataResult){
    //     postEntryResult = {
    //         "date" : `${thisTime().toString()}`,
    //         "userId" : props.userId,
    //         "userSession" : version,
    //         "data" : {
    //             "rawData" : {
    //                 "target" : targetDataResult,
    //                 "trialData" : trialDataResult
    //             },
    //             "gameLogicScheme" : gameLogicSchemeResult,
    //             "scoringData" : scoringDataResult,
    //             "metricData" : metricDataResult
    //         }
    //     }
    //     return postEntryResult;
    // }

    function postEntry(){
        postEntryResult = {
            "date" : `${thisTime().toString()}`,
            "userId" : props.userId,
            "userSession" : version,
            "target" : targetDataResult,
            "trialData" : trialDataResult
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

export default CJSGame;

function endTime() { 
    let d = new Date();
    return d.getTime();
}

function thisTime() {
    let thisTime = moment().format('YYYY-MM-DDTkk:mm:ss.SSSSSS');
    return thisTime;
}