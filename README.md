# MIT-VisionAuth | Smart Attendance System Dataset Portal

> **Production-ready, client-side AI face dataset acquisition web application designed for MIT Academy of Engineering (MIT AoE) Smart Recognition Attendance Systems.**

![MIT-VisionAuth Portal Banner](https://img.shields.io/badge/MIT--VisionAuth-v3.5--AI-0891b2?style=for-the-badge&logo=google-chrome&logoColor=white)
![MediaPipe](https://img.shields.io/badge/AI_Engine-MediaPipe_FaceMesh-0052CC?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT_AoE_Academic-emerald?style=for-the-badge)

---

## 📌 Project Overview

**MIT-VisionAuth** solves the dataset collection bottleneck in AI-driven facial recognition systems. It provides students with a seamless, guided, real-time AI camera interface to capture **8 standardized facial poses** (frontal, slight/moderate left and right turns, pitch up/down, smile, and blinks) directly in the browser. 

The portal automatically validates institutional student metadata, compresses biometric image samples on the client side, checks for duplicate PRN registrations, and transmits organized datasets directly to **Google Drive** and **Google Sheets** via Google Apps Script.

---

## ✨ Key Features

- **🤖 Real-Time MediaPipe AI Sensing:** Evaluates 3D head geometry (yaw, pitch, roll, EAR, smile ratio) continuously in-browser without requiring external web servers.
- **⏱️ Automated 1-Second Hold Capture:** Snaps photos automatically when the student holds the requested head pose inside the oval target frame.
- **📐 Calibrated 8 Poses Specification:**
  1. **Direct Frontal** ($0^\circ$ center)
  2. **Slight Left Turn** ($\sim 20^\circ$ yaw)
  3. **Moderate Left Turn** ($\sim 45^\circ$ yaw)
  4. **Slight Right Turn** ($\sim 20^\circ$ yaw)
  5. **Moderate Right Turn** ($\sim 45^\circ$ yaw)
  6. **Chin Up** ($+15^\circ$ pitch upward)
  7. **Chin Down** ($-15^\circ$ pitch downward)
  8. **Smile / Eye Blink** (Frontal baseline with expression)
- **🔍 Real-Time Duplicate PRN Check:** Checks the central Google Sheet database on PRN input blur to detect existing registrations.
- **🗜️ Client-Side Fast Compression:** Compresses image datasets from ~4MB down to ~200KB before transmission to prevent upload timeouts.
- **🔒 Data Ethics & Consent Disclaimer:** Integrated privacy agreement ensuring compliance with academic research standards.
- **🛡️ Stealth Admin Portal:** PIN-protected modal to configure backend web app URLs and manage script settings on the fly.
- **📁 Structured Directory & File Naming:**
  - Drive Folder: `/MIT_VisionAuth_Datasets/{PRN}/`
  - Image Files: `{PRN}_angle_1.jpg` through `{PRN}_angle_8.jpg`

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** HTML5, CSS3 (Tailwind CSS CDN), Vanilla Modern JavaScript (ES6+).
- **Computer Vision Engine:** Google MediaPipe FaceMesh & Camera Utils (`@mediapipe/face_mesh`).
- **Archive Generation:** JSZip (client-side fallback ZIP generation).
- **Backend / Ingestion API:** Google Apps Script (`Code.gs`) writing to Google Drive API & Google Sheets API.

---

## 🚀 Step-by-Step Usage Guide

### For Students:
1. **Step 1: Academic Registration**
   - Enter your **Full Name**, **PRN Number**, **Contact Number**, **College Email** (`@mitaoe.ac.in`), **Department**, **Division** (`A1`, `B2`, etc.), and **Year of Study**.
   - If your PRN is already registered, an alert banner will notify you with previous registration timestamp details.
   - Accept the Academic Research Data Consent disclaimer and click **Start Automatic AI Camera Session**.

2. **Step 2: Automated Face Pose Capture**
   - Grant webcam permissions when prompted by your browser.
   - Align your face within the central dashed oval guide.
   - Follow the **Top Directional HUD Arrow** and status badge instructions:
     - Turn left or right to the requested angle ($\sim 20^\circ$ or $\sim 45^\circ$).
     - Tilt chin up or down as guided.
   - Once the pose is matched, hold still for **1 second** as the green progress bar fills. The shutter will flash automatically.
   - Review or click thumbnails at any time to retake a specific angle.
   - Click **Verify Dataset Samples** once all 8 images are captured.

3. **Step 3: Verification & Submission**
   - Review captured image samples, formatted metadata row (CSV), and directory paths.
   - Click **Finalize & Submit Dataset** to send data directly to Google Drive & Google Sheets.

4. **Step 4: Submission Receipt**
   - Download or print your transaction confirmation receipt featuring a generated reference ID and SHA-256 integrity hash.

---

## 📄 License & Academic Copyright

© 2026 **MIT Academy of Engineering (MIT AoE)**. All rights reserved. Built exclusively for academic research and evaluation of smart institutional attendance systems.