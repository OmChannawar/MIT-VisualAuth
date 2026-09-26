// --- GLOBAL APP CONFIGURATION STATE ---
let APP_CONFIG = {
    scriptUrl: localStorage.getItem('mit_visionauth_script_url') || "",
    adminPin: "9874",
    allowedEmailDomain: "@mitaoe.ac.in",
    institutionName: "MIT Academy of Engineering (MIT AoE)",
    appName: "MIT-VisionAuth",
    appVersion: "v3.5 AI",
    holdDurationMs: 1000,
    imageOptimization: {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.72
    }
};

// Dynamically fetch and merge config.json settings on initialization
async function loadExternalConfig() {
    try {
        const response = await fetch('./config.json?v=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            if (data) {
                if (data.scriptUrl && data.scriptUrl.startsWith("https://script.google.com")) {
                    APP_CONFIG.scriptUrl = data.scriptUrl.trim();
                    localStorage.setItem('mit_visionauth_script_url', APP_CONFIG.scriptUrl);
                }
                if (data.adminPin) APP_CONFIG.adminPin = data.adminPin;
                if (data.allowedEmailDomain) APP_CONFIG.allowedEmailDomain = data.allowedEmailDomain;
                if (data.appName) APP_CONFIG.appName = data.appName;
                if (data.appVersion) APP_CONFIG.appVersion = data.appVersion;
                if (data.holdDurationMs) APP_CONFIG.holdDurationMs = data.holdDurationMs;
                if (data.imageOptimization) APP_CONFIG.imageOptimization = data.imageOptimization;

                updateUIFromConfig();
            }
        }
    } catch (err) {
        console.warn("External config.json not reachable, using localized state fallback:", err);
    }
}

function updateUIFromConfig() {
    const titleEl = document.getElementById('app-title-display');
    const versionBadge = document.getElementById('app-version-badge');
    const footerVersion = document.getElementById('footer-version-display');
    const emailHint = document.getElementById('email-domain-hint');

    if (titleEl) titleEl.innerText = APP_CONFIG.appName;
    if (versionBadge) versionBadge.innerText = APP_CONFIG.appVersion;
    if (footerVersion) footerVersion.innerText = `${APP_CONFIG.appName} ${APP_CONFIG.appVersion}`;
    if (emailHint) emailHint.innerText = `Must end with official domain (${APP_CONFIG.allowedEmailDomain}).`;
}

const APPS_SCRIPT_SOURCE = `function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "No post data received" })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = JSON.parse(e.postData.contents);
    var parentFolder = getOrCreateFolder("MIT_VisionAuth_Datasets");
    var studentFolderName = (data.prn || "UNKNOWN_PRN").toString().trim().toUpperCase();
    var studentFolder = parentFolder.createFolder(studentFolderName);
    var photoCount = 0;
    if (data.photos && data.photos.length > 0) {
      for (var i = 0; i < data.photos.length; i++) {
        var item = data.photos[i];
        var rawB64 = item.base64 || item;
        if (!rawB64 || typeof rawB64 !== 'string') continue;
        if (rawB64.indexOf(",") !== -1) rawB64 = rawB64.split(",")[1];
        var decoded = Utilities.base64Decode(rawB64);
        var fileName = studentFolderName + "_angle_" + (item.angle || (i + 1)) + ".jpg";
        studentFolder.createFile(Utilities.newBlob(decoded, "image/jpeg", fileName));
        photoCount++;
      }
    }
    var spreadsheet = getOrCreateSpreadsheet("MIT_VisionAuth_Master_Log", parentFolder);
    spreadsheet.getActiveSheet().appendRow([
      new Date().toISOString(), data.prn || "", data.fullName || "", data.email || "", 
      data.department || "", data.division || "", data.year || "", photoCount, studentFolder.getUrl()
    ]);
    return ContentService.createTextOutput(JSON.stringify({ result: "success", folderUrl: studentFolder.getUrl() })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.prn) {
      var prnToCheck = e.parameter.prn.toString().trim().toUpperCase();
      var parentFolder = getOrCreateFolder("MIT_VisionAuth_Datasets");
      var spreadsheet = getOrCreateSpreadsheet("MIT_VisionAuth_Master_Log", parentFolder);
      var sheet = spreadsheet.getActiveSheet();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var rowPrn = (rows[i][1] || "").toString().trim().toUpperCase();
        if (rowPrn === prnToCheck) {
          return ContentService.createTextOutput(JSON.stringify({
            registered: true,
            prn: rowPrn,
            fullName: rows[i][2],
            timestamp: rows[i][0],
            folderUrl: rows[i][8] || ""
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ registered: false })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ registered: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("MIT-VisionAuth Backend Endpoint Active.");
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) return f;
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSpreadsheet(sheetName, parentFolder) {
  var files = DriveApp.getFilesByName(sheetName);
  while (files.hasNext()) {
    var file = files.next();
    if (!file.isTrashed()) return SpreadsheetApp.open(file);
  }
  var ss = SpreadsheetApp.create(sheetName);
  var ssFile = DriveApp.getFileById(ss.getId());
  if (parentFolder) ssFile.moveTo(parentFolder);
  var sheet = ss.getActiveSheet();
  sheet.appendRow(["Timestamp", "PRN", "Full Name", "Email", "Department", "Division", "Year", "Image Count", "Drive Folder Link"]);
  sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  return ss;
}`;

window.addEventListener('DOMContentLoaded', async () => {
    await loadExternalConfig();

    const codeBox = document.getElementById('apps-script-code-box');
    if (codeBox) codeBox.value = APPS_SCRIPT_SOURCE;

    const prnInput = document.getElementById('input-prn');
    const emailInput = document.getElementById('input-email');

    function autoFillEmailAndCheckPRN() {
        const prnVal = prnInput.value.trim().toUpperCase();
        if (prnVal) {
            if (!emailInput.value || emailInput.value.endsWith(APP_CONFIG.allowedEmailDomain)) {
                emailInput.value = `${prnVal.toLowerCase()}${APP_CONFIG.allowedEmailDomain}`;
            }
            checkPRNRegistration(prnVal);
        }
    }

    if (prnInput && emailInput) {
        prnInput.addEventListener('blur', autoFillEmailAndCheckPRN);
    }
});

async function checkPRNRegistration(prn) {
    if (!prn || prn.length < 3) return;
    const spinner = document.getElementById('prn-check-spinner');
    const banner = document.getElementById('prn-registered-banner');

    if (spinner) spinner.classList.remove('hidden');

    try {
        if (APP_CONFIG.scriptUrl && APP_CONFIG.scriptUrl.startsWith("https://script.google.com/macros/s/")) {
            const checkUrl = `${APP_CONFIG.scriptUrl}?prn=${encodeURIComponent(prn)}`;
            const response = await fetch(checkUrl);
            const data = await response.json();

            if (data && data.registered) {
                document.getElementById('reg-prn-display').innerText = data.prn;
                document.getElementById('reg-name-display').innerText = data.fullName || "Existing Student";
                document.getElementById('reg-date-display').innerText = data.timestamp ? new Date(data.timestamp).toLocaleString() : "Previous Session";
                if (banner) banner.classList.remove('hidden');
                showToast(`⚠️ PRN ${data.prn} is already registered!`);
            } else {
                if (banner) banner.classList.add('hidden');
            }
        }
    } catch (err) {
        console.warn("PRN registration status check warning:", err);
    } finally {
        if (spinner) spinner.classList.add('hidden');
    }
}

// --- CAMERA POSE DEFINITIONS & TIMINGS ---
const POSE_STEPS = [
    { id: 1, name: "Direct Frontal", title: "0° (Center) - Look straight into camera", icon: "fa-user", type: "frontal", arrow: null },
    { id: 2, name: "Slight Left Turn", title: "Yaw ~20° - Turn head slightly to your Left", icon: "fa-arrow-left", type: "left_slight", arrow: "fa-arrow-left" },
    { id: 3, name: "Moderate Left Turn", title: "Yaw ~45° - Turn head further to your Left", icon: "fa-angles-left", type: "left_moderate", arrow: "fa-angles-left" },
    { id: 4, name: "Slight Right Turn", title: "Yaw ~20° - Turn head slightly to your Right", icon: "fa-arrow-right", type: "right_slight", arrow: "fa-arrow-right" },
    { id: 5, name: "Moderate Right Turn", title: "Yaw ~45° - Turn head further to your Right", icon: "fa-angles-right", type: "right_moderate", arrow: "fa-angles-right" },
    { id: 6, name: "Chin Up (Look Up)", title: "Pitch +15° - Tilt chin / head Upward", icon: "fa-arrow-up", type: "chin_up", arrow: "fa-arrow-up" },
    { id: 7, name: "Chin Down (Look Down)", title: "Pitch -15° - Tilt chin / head Downward", icon: "fa-arrow-down", type: "chin_down", arrow: "fa-arrow-down" },
    { id: 8, name: "Smile / Eye Blink", title: "Frontal (0°) - Smile naturally or blink eyes", icon: "fa-face-smile-wink", type: "smile_blink", arrow: "fa-face-smile" }
];

let currentStep = 1;
let currentPoseIndex = 0;
let studentData = {};
let capturedPhotos = new Array(8).fill(null);
let mediaStream = null;
let isCameraMirrored = true;
let logoClickCount = 0;

let faceMesh = null;
let isProcessingFrame = false;
let animFrameId = null;
let holdStartTime = null;
let isCapturing = false;

function handleStep1Submit(event) {
    if (event) event.preventDefault();
    if (!validateStudentForm()) return false;
    saveStep1Data();
    goToStep(2);
    return false;
}

function initializeCamera() {
    initializeCameraAndAI();
}

function goToStep(stepNum) {
    if (stepNum === 2 && currentStep === 1) {
        if (!validateStudentForm()) return;
        saveStep1Data();
        initializeCameraAndAI();
    }

    if (stepNum !== 2 && currentStep === 2) {
        stopCamera();
    }

    if (stepNum === 3) {
        populateVerificationGrid();
    }

    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-section-${stepNum}`).classList.remove('hidden');

    for (let i = 1; i <= 4; i++) {
        const navItem = document.getElementById(`step-nav-${i}`);
        if (!navItem) continue;

        const numEl = navItem.querySelector('.step-num');
        const subEl = navItem.querySelector('.step-label-sub');
        const mainEl = navItem.querySelector('.step-label-main');

        if (i === stepNum) {
            navItem.className = "step-nav-item flex items-center space-x-3 p-3.5 rounded-xl bg-cyan-600 border-2 border-cyan-500 text-white shadow-md";
            if (numEl) numEl.className = "step-num w-9 h-9 rounded-lg bg-white text-cyan-800 font-extrabold flex items-center justify-center shrink-0 text-base shadow-sm";
            if (subEl) subEl.className = "step-label-sub text-xs font-bold uppercase tracking-wider text-cyan-100";
            if (mainEl) mainEl.className = "step-label-main text-sm font-extrabold text-white truncate";
        } else if (i < stepNum) {
            navItem.className = "step-nav-item flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-600 border-2 border-emerald-500 text-white shadow-md";
            if (numEl) numEl.className = "step-num w-9 h-9 rounded-lg bg-emerald-900 text-white font-extrabold flex items-center justify-center shrink-0 text-base shadow-sm";
            if (subEl) subEl.className = "step-label-sub text-xs font-bold uppercase tracking-wider text-emerald-100";
            if (mainEl) mainEl.className = "step-label-main text-sm font-extrabold text-white truncate";
        } else {
            navItem.className = "step-nav-item flex items-center space-x-3 p-3.5 rounded-xl bg-white border border-slate-300 text-slate-600 shadow-sm";
            if (numEl) numEl.className = "step-num w-9 h-9 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-base";
            if (subEl) subEl.className = "step-label-sub text-xs font-bold uppercase tracking-wider text-slate-400";
            if (mainEl) mainEl.className = "step-label-main text-sm font-bold text-slate-700 truncate";
        }
    }

    currentStep = stepNum;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveStep1Data() {
    studentData = {
        fullName: document.getElementById('input-fullname').value.trim(),
        prn: document.getElementById('input-prn').value.trim().toUpperCase(),
        phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim().toLowerCase(),
        department: document.getElementById('input-department').value,
        division: document.getElementById('input-division').value,
        year: document.getElementById('input-year').value,
        endpointUrl: APP_CONFIG.scriptUrl
    };
}

function validateStudentForm() {
    const name = document.getElementById('input-fullname').value.trim();
    const prn = document.getElementById('input-prn').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const email = document.getElementById('input-email').value.trim();

    if (!name || name.length < 2) {
        showToast("Please enter a valid full name.");
        return false;
    }
    if (!prn || prn.length < 4) {
        showToast("Please enter a valid PRN / Registration number.");
        return false;
    }
    if (!/^\d{10}$/.test(phone)) {
        showToast("Contact number must be exactly 10 digits.");
        return false;
    }
    if (!email.toLowerCase().endsWith(APP_CONFIG.allowedEmailDomain)) {
        showToast(`Email must belong to ${APP_CONFIG.allowedEmailDomain} domain.`);
        return false;
    }
    if (!document.getElementById('input-department').value) {
        showToast("Please select your academic department.");
        return false;
    }
    if (!document.getElementById('input-division').value) {
        showToast("Please select your division.");
        return false;
    }
    if (!document.getElementById('check-consent').checked) {
        showToast("You must accept the academic research consent disclaimer.");
        return false;
    }
    return true;
}

async function initializeCameraAndAI() {
    const videoEl = document.getElementById('webcam-feed');
    const fallbackEl = document.getElementById('camera-fallback');

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            },
            audio: false
        });

        videoEl.srcObject = mediaStream;
        await videoEl.play();
        fallbackEl.classList.add('hidden');

        if (!faceMesh && typeof window.FaceMesh !== 'undefined') {
            faceMesh = new window.FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMesh.onResults(onFaceMeshResults);
        }

        startProcessingLoop();
        renderPoseList();
        renderThumbnailTray();
    } catch (err) {
        console.error("Camera / AI initialization error:", err);
        fallbackEl.classList.remove('hidden');
    }
}

function startProcessingLoop() {
    const videoEl = document.getElementById('webcam-feed');

    async function processFrame() {
        if (videoEl && !videoEl.paused && !videoEl.ended && faceMesh && !isProcessingFrame) {
            isProcessingFrame = true;
            try {
                await faceMesh.send({ image: videoEl });
            } catch (e) {
                console.warn("FaceMesh process frame warning:", e);
            }
            isProcessingFrame = false;
        }
        if (mediaStream) {
            animFrameId = requestAnimationFrame(processFrame);
        }
    }

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(processFrame);
}

function stopCamera() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    resetHoldProgress();
    clearMeshCanvas();
}

function toggleCameraMirror() {
    isCameraMirrored = !isCameraMirrored;
    const videoEl = document.getElementById('webcam-feed');
    const meshCanvas = document.getElementById('mesh-canvas');
    const transform = isCameraMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    videoEl.style.transform = transform;
    meshCanvas.style.transform = transform;
}

function clearMeshCanvas() {
    const canvas = document.getElementById('mesh-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function onFaceMeshResults(results) {
    const badgeText = document.getElementById('ai-status-text');
    const ovalGuide = document.getElementById('oval-guide');
    const meshCanvas = document.getElementById('mesh-canvas');
    const videoEl = document.getElementById('webcam-feed');

    if (!meshCanvas || !videoEl) return;

    meshCanvas.width = videoEl.videoWidth || 640;
    meshCanvas.height = videoEl.videoHeight || 480;
    const ctx = meshCanvas.getContext('2d');
    ctx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        if (badgeText) badgeText.innerHTML = `<span class="text-amber-400 font-bold">No face detected in frame</span>`;
        ovalGuide.classList.remove('matched-pose');
        resetHoldProgress();
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    ctx.fillStyle = "rgba(6, 182, 212, 0.7)";
    const keyPoints = [1, 33, 263, 61, 291, 199, 10, 152, 234, 454];
    keyPoints.forEach(ptIdx => {
        const pt = landmarks[ptIdx];
        if (pt) {
            ctx.beginPath();
            ctx.arc(pt.x * meshCanvas.width, pt.y * meshCanvas.height, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    const metrics = calculateFaceMetrics(landmarks);
    const currentReqPose = POSE_STEPS[currentPoseIndex].type;
    const isMatch = checkPoseMatch(currentReqPose, metrics);

    if (isMatch) {
        if (badgeText) badgeText.innerHTML = `<span class="text-emerald-400 font-bold"><i class="fa-solid fa-circle-check"></i> ${POSE_STEPS[currentPoseIndex].name} Matched! Hold Still...</span>`;
        ovalGuide.classList.add('matched-pose');
        startOrUpdateHoldTimer();
    } else {
        if (badgeText) badgeText.innerHTML = `<span class="text-cyan-300 font-medium">${getPoseGuidanceText(currentReqPose, metrics)}</span>`;
        ovalGuide.classList.remove('matched-pose');
        resetHoldProgress();
    }
}

function calculateFaceMetrics(lm) {
    const nose = lm[1];
    const leftCheek = lm[234];
    const rightCheek = lm[454];
    const topHead = lm[10];
    const chin = lm[152];

    const cheekWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y) || 0.001;
    const midCheekX = (leftCheek.x + rightCheek.x) / 2;
    const yawOffset = (nose.x - midCheekX) / cheekWidth;

    const faceHeight = Math.hypot(chin.x - topHead.x, chin.y - topHead.y) || 0.001;
    const midVertY = (topHead.y + chin.y) / 2;
    const pitchOffset = (nose.y - midVertY) / faceHeight;

    const roll = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) * (180 / Math.PI);

    const lipLeft = lm[61];
    const lipRight = lm[291];
    const mouthWidth = Math.hypot(lipRight.x - lipLeft.x, lipRight.y - lipLeft.y);
    const smileRatio = mouthWidth / cheekWidth;

    const eyeTop = lm[159];
    const eyeBottom = lm[145];
    const eyeLeft = lm[33];
    const eyeRight = lm[133];
    const ear = Math.hypot(eyeTop.x - eyeBottom.x, eyeTop.y - eyeBottom.y) / (Math.hypot(eyeRight.x - eyeLeft.x, eyeRight.y - eyeLeft.y) || 0.001);

    return { yawOffset, pitchOffset, roll, smileRatio, ear };
}

function checkPoseMatch(targetType, m) {
    const yVal = isCameraMirrored ? m.yawOffset : -m.yawOffset;

    switch (targetType) {
        case 'frontal':
            return Math.abs(yVal) < 0.08 && Math.abs(m.pitchOffset - 0.02) < 0.10;
        case 'left_slight':
            return yVal >= 0.10 && yVal <= 0.22;
        case 'left_moderate':
            return yVal > 0.22;
        case 'right_slight':
            return yVal <= -0.10 && yVal >= -0.22;
        case 'right_moderate':
            return yVal < -0.22;
        case 'chin_up':
            return m.pitchOffset < -0.05;
        case 'chin_down':
            return m.pitchOffset > 0.08;
        case 'smile_blink':
            return m.smileRatio > 0.36 || m.ear < 0.18;
        default:
            return false;
    }
}

function getPoseGuidanceText(targetType, m) {
    const yVal = isCameraMirrored ? m.yawOffset : -m.yawOffset;

    switch (targetType) {
        case 'frontal':
            return Math.abs(yVal) >= 0.08 ? "Center your head in oval" : "Look straight into camera";
        case 'left_slight':
            return yVal < 0.10 ? "Turn head slightly LEFT (~20°)" : "Hold 20° left angle...";
        case 'left_moderate':
            return yVal <= 0.22 ? "Turn head further LEFT (~45°)" : "Hold 45° left angle...";
        case 'right_slight':
            return yVal > -0.10 ? "Turn head slightly RIGHT (~20°)" : "Hold 20° right angle...";
        case 'right_moderate':
            return yVal >= -0.22 ? "Turn head further RIGHT (~45°)" : "Hold 45° right angle...";
        case 'chin_up':
            return m.pitchOffset >= -0.05 ? "Tilt head UPWARDS (+15°)" : "Hold chin up position...";
        case 'chin_down':
            return m.pitchOffset <= 0.08 ? "Tilt head DOWNWARDS (-15°)" : "Hold chin down position...";
        case 'smile_blink':
            return "Smile or Blink your eyes";
        default:
            return "Align face inside oval guide";
    }
}

function startOrUpdateHoldTimer() {
    if (isCapturing) return;

    const container = document.getElementById('hold-progress-bar-container');
    const fill = document.getElementById('hold-progress-fill');
    const percText = document.getElementById('hold-percentage');

    if (container) container.classList.remove('hidden');

    if (!holdStartTime) {
        holdStartTime = performance.now();
        playBeepSound(800, 0.08);
    }

    const elapsed = performance.now() - holdStartTime;
    const progress = Math.min(100, Math.round((elapsed / APP_CONFIG.holdDurationMs) * 100));

    if (fill) fill.style.width = `${progress}%`;
    if (percText) percText.innerText = `${progress}%`;

    if (progress >= 100) {
        isCapturing = true;
        holdStartTime = null;
        resetHoldProgress();
        captureSnapshot();
        setTimeout(() => { isCapturing = false; }, 800);
    }
}

function resetHoldProgress() {
    holdStartTime = null;
    const container = document.getElementById('hold-progress-bar-container');
    const fill = document.getElementById('hold-progress-fill');
    if (container) container.classList.add('hidden');
    if (fill) fill.style.width = '0%';
}

async function compressBase64Image(base64Str, maxWidth = 640, maxHeight = 480, quality = 0.72) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
}

function captureSnapshot() {
    const videoEl = document.getElementById('webcam-feed');
    const canvas = document.getElementById('snapshot-canvas');
    const flash = document.getElementById('shutter-flash');

    if (!videoEl || !canvas) return;

    if (flash) {
        flash.classList.remove('shutter-flash');
        void flash.offsetWidth;
        flash.classList.add('shutter-flash');
    }

    playBeepSound(1200, 0.15);

    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (isCameraMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    capturedPhotos[currentPoseIndex] = photoDataUrl;

    showToast(`Angle ${currentPoseIndex + 1} Captured!`);

    const nextEmptyIndex = capturedPhotos.findIndex(img => img === null);
    if (nextEmptyIndex !== -1) {
        currentPoseIndex = nextEmptyIndex;
    }

    renderPoseList();
    renderThumbnailTray();
    updatePoseUI();
}

function renderPoseList() {
    const container = document.getElementById('pose-list-container');
    if (!container) return;

    container.innerHTML = POSE_STEPS.map((pose, idx) => {
        const isCaptured = !!capturedPhotos[idx];
        const isActive = idx === currentPoseIndex;

        let stateStyle = "bg-slate-50 border-slate-200 text-slate-700";
        if (isActive) {
            stateStyle = "bg-cyan-50 border-2 border-cyan-600 text-slate-900 ring-2 ring-cyan-500/20 shadow-sm";
        } else if (isCaptured) {
            stateStyle = "bg-emerald-50 border border-emerald-300 text-emerald-900";
        }

        return `
                    <div onclick="selectPoseStep(${idx})" class="p-3 rounded-xl border ${stateStyle} cursor-pointer transition flex items-center justify-between hover:border-slate-400">
                        <div class="flex items-center space-x-3 overflow-hidden">
                            <div class="w-7 h-7 rounded-lg ${isCaptured ? 'bg-emerald-600 text-white' : (isActive ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700')} flex items-center justify-center text-xs shrink-0 font-bold">
                                ${isCaptured ? '<i class="fa-solid fa-check"></i>' : idx + 1}
                            </div>
                            <div class="truncate">
                                <div class="text-xs font-extrabold truncate">${pose.name}</div>
                                <div class="text-[11px] font-medium text-slate-500 truncate">${pose.title}</div>
                            </div>
                        </div>
                        ${isCaptured ? '<span class="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-mono font-bold">Captured</span>' : ''}
                    </div>
                `;
    }).join('');

    updatePoseUI();
}

function selectPoseStep(index) {
    currentPoseIndex = index;
    resetHoldProgress();
    updatePoseUI();
    renderPoseList();
}

function updatePoseUI() {
    const currentPose = POSE_STEPS[currentPoseIndex];
    if (!currentPose) return;

    document.getElementById('pose-step-title').innerText = `Image ${currentPose.id} of 8: ${currentPose.name}`;
    document.getElementById('pose-instruction').innerText = currentPose.title;
    document.getElementById('pose-icon').innerHTML = `<i class="fa-solid ${currentPose.icon}"></i>`;
    document.getElementById('capture-counter-badge').innerText = `Image ${currentPoseIndex + 1} of 8`;

    const hud = document.getElementById('direction-arrow-hud');
    const arrowContainer = document.getElementById('arrow-icon-container');
    const arrowLabel = document.getElementById('arrow-text-label');

    if (currentPose.arrow && hud && arrowContainer) {
        arrowContainer.innerHTML = `<i class="fa-solid ${currentPose.arrow}"></i>`;
        if (arrowLabel) arrowLabel.innerText = currentPose.name;
        hud.classList.remove('hidden');
    } else if (hud) {
        hud.classList.add('hidden');
    }

    const capturedCount = capturedPhotos.filter(Boolean).length;
    document.getElementById('captured-ratio').innerText = `${capturedCount} / 8 Captured`;

    const btnTo3 = document.getElementById('btn-to-step3');
    if (btnTo3) btnTo3.disabled = capturedCount < 8;
}

function renderThumbnailTray() {
    const tray = document.getElementById('thumbnail-tray');
    if (!tray) return;

    tray.innerHTML = POSE_STEPS.map((pose, idx) => {
        const photo = capturedPhotos[idx];
        return `
                    <div onclick="selectPoseStep(${idx})" class="relative aspect-square rounded-xl bg-slate-100 border border-slate-300 overflow-hidden cursor-pointer hover:border-cyan-600 transition group shadow-sm">
                        ${photo ? `<img src="${photo}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px] p-1 text-center font-bold"><i class="fa-solid ${pose.icon} mb-1 text-sm text-slate-400"></i>Angle ${idx + 1}</div>`}
                        <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-extrabold">
                            ${photo ? 'Retake' : 'Capture'}
                        </div>
                        <div class="absolute bottom-1 left-1 right-1 bg-slate-900/80 px-1 py-0.5 rounded text-[9px] text-white font-mono font-bold truncate text-center">
                            A${idx + 1}
                        </div>
                    </div>
                `;
    }).join('');
}

function populateVerificationGrid() {
    document.getElementById('review-name').innerText = studentData.fullName;
    document.getElementById('review-prn').innerText = studentData.prn;
    document.getElementById('review-dept').innerText = `${studentData.department} (Div ${studentData.division})`;
    document.getElementById('summary-folder-path').innerText = `/dataset/${studentData.prn}/`;

    const grid = document.getElementById('verification-grid');
    grid.innerHTML = POSE_STEPS.map((pose, idx) => {
        const photo = capturedPhotos[idx];
        const fileName = `${studentData.prn}_angle_${idx + 1}.jpg`;
        return `
                    <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2 space-y-2 shadow-sm">
                        <div class="aspect-video rounded-lg overflow-hidden bg-slate-900 relative">
                            <img src="${photo}" class="w-full h-full object-cover">
                            <span class="absolute top-1 left-1 bg-slate-900/90 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-mono font-bold">
                                Angle ${idx + 1}
                            </span>
                        </div>
                        <div>
                            <div class="text-xs font-extrabold text-slate-900 truncate">${pose.name}</div>
                            <div class="text-[10px] font-mono text-slate-500 font-semibold truncate">${fileName}</div>
                        </div>
                    </div>
                `;
    }).join('');

    const csvHeader = "Timestamp,PRN,FullName,Email,Department,Division,Year,FolderPath\n";
    const csvRow = `"${new Date().toISOString()}","${studentData.prn}","${studentData.fullName}","${studentData.email}","${studentData.department}","${studentData.division}","${studentData.year}","/dataset/${studentData.prn}/"`;
    document.getElementById('csv-preview').innerText = csvHeader + csvRow;
}

async function submitDataset() {
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-status-text');
    const percentageText = document.getElementById('upload-percentage');

    progressContainer.classList.remove('hidden');

    try {
        progressText.innerText = "Optimizing dataset images for Google Drive...";
        progressBar.style.width = "25%";
        percentageText.innerText = "25%";

        const compressedPhotosList = [];
        const maxW = APP_CONFIG.imageOptimization ? APP_CONFIG.imageOptimization.maxWidth : 640;
        const maxH = APP_CONFIG.imageOptimization ? APP_CONFIG.imageOptimization.maxHeight : 480;
        const quality = APP_CONFIG.imageOptimization ? APP_CONFIG.imageOptimization.quality : 0.72;

        for (let i = 0; i < capturedPhotos.length; i++) {
            if (capturedPhotos[i]) {
                const compressedB64 = await compressBase64Image(capturedPhotos[i], maxW, maxH, quality);
                compressedPhotosList.push({ angle: i + 1, base64: compressedB64 });
            }
        }

        if (studentData.endpointUrl && studentData.endpointUrl.startsWith("https://script.google.com/macros/s/")) {
            progressText.innerText = "Transmitting to Google Drive & Master Sheet...";
            progressBar.style.width = "60%";
            percentageText.innerText = "60%";

            const payload = {
                prn: studentData.prn,
                fullName: studentData.fullName,
                email: studentData.email,
                department: studentData.department,
                division: studentData.division,
                year: studentData.year,
                photos: compressedPhotosList
            };

            await fetch(studentData.endpointUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            progressBar.style.width = "100%";
            percentageText.innerText = "100%";

        } else {
            progressText.innerText = "Generating client ZIP dataset archive...";
            progressBar.style.width = "50%";
            percentageText.innerText = "50%";

            const zip = new JSZip();
            const datasetFolder = zip.folder(`dataset/${studentData.prn}`);

            capturedPhotos.forEach((photoUrl, idx) => {
                const base64Data = photoUrl.replace(/^data:image\/jpeg;base64,/, "");
                datasetFolder.file(`${studentData.prn}_angle_${idx + 1}.jpg`, base64Data, { base64: true });
            });

            const csvContent = `Timestamp,PRN,FullName,Email,Department,Division,Year,FolderPath\n"${new Date().toISOString()}","${studentData.prn}","${studentData.fullName}","${studentData.email}","${studentData.department}","${studentData.division}","${studentData.year}","/dataset/${studentData.prn}/"`;
            zip.file(`metadata_${studentData.prn}.csv`, csvContent);

            progressBar.style.width = "85%";
            percentageText.innerText = "85%";

            const zipBlob = await zip.generateAsync({ type: "blob" });
            progressBar.style.width = "100%";
            percentageText.innerText = "100%";

            const downloadUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `MIT_VisionAuth_Dataset_${studentData.prn}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setTimeout(() => {
            populateReceipt();
            goToStep(4);
        }, 600);

    } catch (err) {
        console.error("Submission Error:", err);
        showToast("Upload issue encountered: " + err.message);
        progressContainer.classList.add('hidden');
    }
}

function populateReceipt() {
    const refId = `MIT-VA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    document.getElementById('receipt-ref-id').innerText = refId;
    document.getElementById('receipt-timestamp').innerText = new Date().toLocaleString();
    document.getElementById('receipt-prn').innerText = studentData.prn;
    document.getElementById('receipt-path').innerText = `/dataset/${studentData.prn}/`;
    document.getElementById('receipt-hash').innerText = generateMockHash();
}

function generateMockHash() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function downloadReceiptPDF() {
    window.print();
}

function resetDatasetPortal() {
    capturedPhotos = new Array(8).fill(null);
    studentData = {};
    currentPoseIndex = 0;
    const banner = document.getElementById('prn-registered-banner');
    if (banner) banner.classList.add('hidden');
    document.getElementById('student-form').reset();
    goToStep(1);
}

function handleLogoClick() {
    logoClickCount++;
    if (logoClickCount >= 500) {
        logoClickCount = 0;
        toggleAdminModal(true);
    }
}

function openAdminPortalPrompt() {
    toggleAdminModal(true);
}

function toggleAdminModal(show) {
    const modal = document.getElementById('admin-modal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function verifyAdminPin() {
    const pin = document.getElementById('admin-pin').value;
    if (pin === APP_CONFIG.adminPin) {
        document.getElementById('admin-settings-panel').classList.remove('hidden');
        document.getElementById('btn-pin-submit').classList.add('hidden');
        document.getElementById('btn-settings-save').classList.remove('hidden');
        document.getElementById('admin-endpoint-url').value = APP_CONFIG.scriptUrl;
        showToast("Admin access unlocked.");
    } else {
        showToast("Incorrect PIN code.");
    }
}

function saveAdminSettings() {
    const newUrl = document.getElementById('admin-endpoint-url').value.trim();
    if (newUrl) {
        APP_CONFIG.scriptUrl = newUrl;
        localStorage.setItem('mit_visionauth_script_url', newUrl);
        showToast("Google Web App URL saved successfully!");
    }
    toggleAdminModal(false);
}

function copyAppsScriptCode() {
    const codeBox = document.getElementById('apps-script-code-box');
    if (codeBox) {
        codeBox.select();
        document.execCommand('copy');
        const btnText = document.getElementById('copy-code-btn-text');
        if (btnText) {
            btnText.innerText = "Copied!";
            setTimeout(() => { btnText.innerText = "Copy Script"; }, 2000);
        }
        showToast("Apps Script code copied to clipboard!");
    }
}

function playBeepSound(freq, duration) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) { }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-cyan-700 text-white font-extrabold px-5 py-3.5 rounded-xl text-xs shadow-2xl z-50 transition transform translate-y-0';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}