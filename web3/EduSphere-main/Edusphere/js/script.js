document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const prompt = document.getElementById('prompt');

    // Load face-api.js models
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');

    // Access the webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = stream;
    webcamVideo.play();

    // Function to detect face
    async function detectFace() {
        const detections = await faceapi.detectAllFaces(webcamVideo, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        return detections.length > 0;
    }

    // Function to handle video play/pause based on face detection
    async function handleVideoControl() {
        const isLooking = await detectFace();
        if (isLooking) {
            video.play();
            prompt.style.display = 'none';
        } else {
            video.pause();
            prompt.style.display = 'block';
        }
    }

    // Function to handle tab focus
    function handleTabFocus() {
        if (document.hidden) {
            video.pause();
            prompt.style.display = 'block';
        } else {
            handleVideoControl();
        }
    }

    // Set interval to check for face detection
    setInterval(handleVideoControl, 1000);

    // Add event listeners for tab focus
    document.addEventListener('visibilitychange', handleTabFocus);
});

const video = document.getElementById("modal-video");
const popup = document.getElementById("popup-alert");
const popupClose = document.getElementById("popup-close");

// Function to show popup
const showPopup = () => {
    popup.classList.remove("hidden");
};

// Function to hide popup
popupClose.addEventListener("click", () => {
    popup.classList.add("hidden");
});

// Warn user when trying to leave the page
window.addEventListener("beforeunload", (event) => {
    event.preventDefault();
    event.returnValue = "You must stay on this page to complete the video.";
});

// Pause video and show popup on tab switch
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        video.pause();
        showPopup();
    }
});

// Pause video when modal is closed
const modal = document.querySelector(".video-lightbox");
modal.addEventListener("hide.bs.modal", () => {
    video.pause();
});
