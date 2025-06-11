document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("video-player");
    const videoContainer = document.getElementById("video-container");
    const popup = document.getElementById("popup-alert");
    const popupClose = document.getElementById("popup-close");
    const closeVideoButton = document.getElementById("close-video");

    // Function to play the video
    window.playVideo = function () {
        videoContainer.classList.remove("hidden"); // Make the video visible
        video.play(); // Play the video
    };

    // Function to show the popup overlay
    const showPopup = () => {
        popup.classList.remove("hidden");
    };

    // Function to hide the popup overlay
    popupClose.addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    // Pause video and show popup on tab switch
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            video.pause(); // Pause the video
            showPopup(); // Show the popup
        }
    });

    // Close video when the X button is clicked
    closeVideoButton.addEventListener("click", () => {
        videoContainer.classList.add("hidden"); // Hide the video
        video.pause(); // Pause the video
    });
});
