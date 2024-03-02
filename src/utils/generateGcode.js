import { version } from '../lib/version'
import { replaceTemplateVars } from './replaceTemplateVars';
import { validMaxFlowStepsPerColumn } from './boundaryChecks';
import seedrandom from 'seedrandom';

function shuffleArray(array, prng) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export default function generateGcode(data, { addHeader=true }={}) {
    const {
        filamentDiameter,
        travelSpeed,
        dwellTime,
        primeLength,
        primeAmount,
        primeSpeed,
        wipeLength,
        retractionDistance,
        retractionSpeed,
        blobHeight,
        extrusionAmount,
        direction,
        tempSpacing,
        flowOffset,
        flowEnd,
        tempStart,
        primingHeight,
        startHeight,
        temperatureGCodeType,
        heatBeforeDwell,        
        randomizeTestOrder,
        randomizeTestOrderSeed,
        toolNumber,
        dwellHeight,
        dwellCFactorRising,
        dwellCFactorFalling,
        dwellGCodeUnits,
        /* eslint-disable */ 
        bedWidth,
        safeZPark,
        tempEnd,
        bedTemp,
        fanSpeed,
        extrusionVolume,
        /* eslint-enable */
      } = data;

    let {
        bedLength,
        bedMarginX,
        bedMarginY,
        flowSpacing,
        flowStart,
        flowSteps,
        tempSteps,
        tempOffset,
      } = data;

    const startGcode = replaceTemplateVars(data.startGcode, data)
    const endGcode = replaceTemplateVars(data.endGcode, data); 
    const dwellUsingMs = dwellGCodeUnits == `ms`;
    const g4Prefix = dwellUsingMs ? `G4 P` : `G4 S`;
    const dwellTimeInCorrectUnits = dwellUsingMs ? dwellTime * 1000.0 : dwellTime;

    let output = [];

    // Fill Flow Mode
    if (tempSteps === 1) {
        const maxFlowStepsPerColumn = validMaxFlowStepsPerColumn();
        if (flowSteps > maxFlowStepsPerColumn) {
            tempSteps = Math.ceil(flowSteps / maxFlowStepsPerColumn);
            flowSteps =  maxFlowStepsPerColumn;
        }
        tempOffset = 0;
    }

    if (direction === 1) {
        bedLength = 0
        bedMarginY = bedMarginY * -1
        flowSpacing = flowSpacing * -1
    }

    if (addHeader) {
        // Credits
        output.push(`; *** FlowTestGenerator.js (v${version}) by iFallUpHill`)
        output.push(`; *** https://github.com/iFallUpHill/flow-calculator`)
        output.push(`; *** Based on CNCKitchen's ExtrusionSystemBenchmark by Stefan Hermann`)
        output.push(`; *** https://github.com/CNCKitchen/ExtrusionSystemBenchmark`)

        if (data.model) {
            output.push(`; Model: ${data.model}`);
        }

        if (data.notes) {
            output.push(`; Notes:`);
            output.push(`; ${data.notes.replaceAll(`\n`, `\n; `)}`);
        }

        output.push("")
        
        // Generation Settings
        output.push(";####### Settings")
        for (const [key, value] of Object.entries(data)) {
            if (!['startGcode', 'endGcode', 'model', 'notes'].includes(key)) {
                output.push(`; ${key} = ${value}`);
            }
        }
        output.push("");
    }
    
    output.push(";####### Start Gcode");
    startGcode.split("\n").forEach(line => {
        output.push(line);
    })
    output.push("");

    output.push(`; [SAFETY] Force Relative Extrusion`)
    output.push(`M83 ; set extruder to relative mode`)
    output.push("");

    let tests = randomizeTestOrder ? [] : null;

    for (let i = 1; i <= tempSteps; i++) {
        if (tempOffset === 0 && i > 1) {
            flowStart = flowStart + flowSteps * flowOffset;
        }
        for (let j = 1; j <= flowSteps; j++) {

            if (tempOffset === 0 && i === tempSteps && flowStart + (j - 2) * flowOffset === flowEnd) break;

            let testOutput = randomizeTestOrder ? [] : output;
            let temp = tempStart + (i - 1) * tempOffset;
            
            let setNozzleTemp = toolNumber 
                ? `M${temperatureGCodeType} S${temp} T${toolNumber}`
                : `M${temperatureGCodeType} S${temp}`;

            let testDescComment = `;####### ${temp}°C // ${flowStart + (j - 1) * flowOffset}mm3/s`;
            let testDescMessage = `M117 ${temp}C // ${flowStart + (j - 1) * flowOffset}mm3/s`;

            if (j === 1 || randomizeTestOrder) {
                if (randomizeTestOrder) {
                    testOutput.push(testDescComment);
                }
                else {
                    testOutput.push(`;####### ${temp}°C`);
                    if (dwellHeight) {
                        testOutput.push(`G0 Z${dwellHeight} ; Move to dwell height`);
                    }
                    if (heatBeforeDwell) {
                        testOutput.push(setNozzleTemp);
                        testOutput.push(`${g4Prefix}${dwellTimeInCorrectUnits}; Dwell`);
                    } else {
                        testOutput.push(`${g4Prefix}${dwellTimeInCorrectUnits}; Dwell`);
                        testOutput.push(setNozzleTemp);
                    }
                }
    
                testOutput.push("");
            }

            let extrusionSpeed = Math.round((blobHeight / (extrusionAmount / ((flowStart + (j - 1) * flowOffset) / (Math.atan(1) * filamentDiameter * filamentDiameter) * 60)) + Number.EPSILON) * 100) / 100;

            if (!randomizeTestOrder) {
                testOutput.push(testDescComment);
                testOutput.push(testDescMessage);
            }

            testOutput.push(`G0 X${Math.abs(bedMarginX) + ((i - 1) * (primeLength + wipeLength + tempSpacing))} Y${(bedLength - bedMarginY) - (j - 1) * flowSpacing} Z${0.5 + blobHeight + 5} F${travelSpeed * 60}`);

            if (randomizeTestOrder) {
                if (dwellHeight) {
                    testOutput.push(`G0 Z${dwellHeight} ; Move to dwell height`);
                }
                testOutput.push(testDescMessage);
                if (heatBeforeDwell) {
                    testOutput.push(setNozzleTemp);
                    testOutput.push(`${g4Prefix}$$dwellTime$$; Dwell`);
                } else {
                    testOutput.push(`${g4Prefix}$$dwellTime$$; Dwell`);
                    testOutput.push(setNozzleTemp);
                }
            }

            testOutput.push(`G0 Z${primingHeight} ; Move to priming height`);
            testOutput.push(`G1 X${Math.abs(bedMarginX) + primeLength + ((i - 1) * (primeLength + wipeLength + tempSpacing))} E${primeAmount} F${(primeSpeed * 60)} ; Prime`);
            testOutput.push(`G1 E${-1 * retractionDistance} F${retractionSpeed * 60} ; Retract`);
            testOutput.push(`G0 X${Math.abs(bedMarginX) + primeLength + wipeLength + ((i - 1) * (primeLength + wipeLength + tempSpacing))} F${travelSpeed * 60} ; Wipe`);
            testOutput.push(`G0 Z${startHeight}  ; Lift`);
            testOutput.push(`G1 E${retractionDistance} F${retractionSpeed * 60} ; Undo Retract`);
            testOutput.push(`G1 Z${startHeight + blobHeight} E${extrusionAmount} F${extrusionSpeed} ; Extrude`);
            testOutput.push(`G1 E${-1 * retractionDistance} F${retractionSpeed * 60} ; Retract`);
            testOutput.push(`G0 Z${startHeight + blobHeight + 5}; Lift`);
            testOutput.push(`G0 X${Math.abs(bedMarginX) + ((i - 1) * (primeLength + wipeLength + tempSpacing))} Y${(bedLength - bedMarginY) - (j - 1) * flowSpacing} F${travelSpeed * 60}`);
            testOutput.push("G92 E0 ; Reset Extruder");
            testOutput.push("");

            if ( randomizeTestOrder ) {
                tests.push( { output: testOutput, temp: temp } );
            }
        }
    }
    
    if (randomizeTestOrder) {        
        let prng = seedrandom(randomizeTestOrderSeed ? randomizeTestOrderSeed : null);
        shuffleArray(tests, prng);
        let lastTemp = tempStart;
        for (const test of tests) {
            let useDwellTime = dwellTime;
            if (lastTemp) {
                let delta = test.temp - lastTemp;
                if (delta > 0 && dwellCFactorRising) {
                    useDwellTime += delta * dwellCFactorRising;
                } 
                else if ( delta < 0 && dwellCFactorFalling) {
                    useDwellTime += -delta * dwellCFactorFalling;
                }
            }
            if (dwellUsingMs) {
                useDwellTime *= 1000.0;
            }

            lastTemp = test.temp;
            for (const line of test.output) {
                output.push(line.replaceAll('$$dwellTime$$', useDwellTime));
            }
        }
    }
    
    output.push(";####### End Gcode");
    endGcode.split("\n").forEach(line => {
        output.push(line);
    })

    return output.join("\n");
}
