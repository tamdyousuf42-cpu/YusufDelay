
"use strict";

// Yusuf Delay - Audio Controller

let audioContext = null;
let micStreams = [];
let micSources = [];
let delayNode = null;
let feedbackGain = null;
let wetGain = null;
let dryGain = null;
let masterGain = null;
let compressor = null;

let running = false;
let selectedMic = "mic1";
let selectedOutput = "default";

const mic1Button = document.getElementById("mic1");
const mic2Button = document.getElementById("mic2");
const bothMicsButton = document.getElementById("bothMics");

const startButton = document.getElementById("startAudio");
const stopButton = document.getElementById("stopAudio");

const delaySlider = document.getElementById("delayTime");

function updateButtons() {
    if (startButton) startButton.disabled = running;
    if (stopButton) stopButton.disabled = !running;
}

function selectMic(mode) {
    selectedMic = mode;

    if (mic1Button) {
        mic1Button.classList.toggle("active", mode === "mic1");
    }

    if (mic2Button) {
        mic2Button.classList.toggle("active", mode === "mic2");
    }

    if (bothMicsButton) {
        bothMicsButton.classList.toggle("active", mode === "both");
    }
}

async function getMicDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices.filter(device => device.kind === "audioinput");
}

async function startAudio() {
    if (running) return;

    try {
        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )({
            latencyHint: "interactive"
        });

        await audioContext.resume();

        const devices = await getMicDevices();

        if (devices.length === 0) {
            throw new Error("Microphone nahi mila.");
        }

        let chosenDevices = [];

        if (selectedMic === "mic1") {
            chosenDevices = [devices[0]];
        } else if (selectedMic === "mic2") {
            chosenDevices = [devices[1] || devices[0]];
        } else {
            chosenDevices = devices.slice(0, 2);
        }

        for (const device of chosenDevices) {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: {
                        exact: device.deviceId
                    },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            micStreams.push(stream);

            const source =
                audioContext.createMediaStreamSource(stream);

            micSources.push(source);
        }

        delayNode = audioContext.createDelay(5);

        delayNode.delayTime.value =
            delaySlider ? Number(delaySlider.value) : 0.25;

        feedbackGain = audioContext.createGain();
        feedbackGain.gain.value = 0.15;

        wetGain = audioContext.createGain();
        wetGain.gain.value = 0.30;

        dryGain = audioContext.createGain();
        dryGain.gain.value = 0.75;

        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.70;

        compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 10;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;

        for (const source of micSources) {
            source.connect(dryGain);
            source.connect(delayNode);
        }

        delayNode.connect(wetGain);
        wetGain.connect(masterGain);

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);

        dryGain.connect(masterGain);

        masterGain.connect(compressor);
        compressor.connect(audioContext.destination);

        running = true;
        updateButtons();

    } catch (error) {
        alert("Audio problem: " + error.message);
        await stopAudio();
    }
}

async function stopAudio() {
    for (const stream of micStreams) {
        for (const track of stream.getTracks()) {
            track.stop();
        }
    }

    micStreams = [];
    micSources = [];

    if (audioContext) {
        try {
            await audioContext.close();
        } catch (error) {
            console.log(error);
        }

        audioContext = null;
    }

    delayNode = null;
    feedbackGain = null;
    wetGain = null;
    dryGain = null;
    masterGain = null;
    compressor = null;

    running = false;
    updateButtons();
}

function changeDelay() {
    if (!delaySlider || !delayNode || !audioContext) {
        return;
    }

    delayNode.delayTime.setTargetAtTime(
        Number(delaySlider.value),
        audioContext.currentTime,
        0.02
    );
}

if (mic1Button) {
    mic1Button.addEventListener("click", () => {
        selectMic("mic1");
    });
}

if (mic2Button) {
    mic2Button.addEventListener("click", () => {
        selectMic("mic2");
    });
}

if (bothMicsButton) {
    bothMicsButton.addEventListener("click", () => {
        selectMic("both");
    });
}

if (startButton) {
    startButton.addEventListener("click", startAudio);
}

if (stopButton) {
    stopButton.addEventListener("click", stopAudio);
}

if (delaySlider) {
    delaySlider.addEventListener("input", changeDelay);
}

selectMic("mic1");
updateButtons();
