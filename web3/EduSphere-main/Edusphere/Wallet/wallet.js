// Check if MetaMask is installed
if (typeof window.ethereum !== 'undefined') {
    console.log("MetaMask is installed!");
} else {
    alert("Please install MetaMask!");
}

// Get elements
const connectButton = document.getElementById("connectButton");
const userDetails = document.getElementById("userDetails");
const walletAddress = document.getElementById("walletAddress");
const logoutButton = document.getElementById("logoutButton");

let userAccount = localStorage.getItem('userAccount'); // Get wallet address from localStorage

// If wallet address exists in localStorage, display it
if (userAccount) {
    walletAddress.innerText = `Connected Wallet: ${userAccount}`;
    userDetails.style.display = 'block';
}

// Toggle the dropdown visibility when the wallet icon is clicked
connectButton.addEventListener("click", async () => {
    if (!userAccount) {
        // Request the user's MetaMask account if not already connected
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAccount = accounts[0];

            // Store the wallet address in localStorage for persistence
            localStorage.setItem('userAccount', userAccount);
            walletAddress.innerText = `Connected Wallet: ${userAccount}`;
            userDetails.style.display = 'block';
            console.log('User Account:', userAccount);
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
        }
    } else {
        // Toggle the display of the user details (show/hide the dropdown)
        userDetails.style.display = (userDetails.style.display === 'none' || userDetails.style.display === '') ? 'block' : 'none';
    }
});

// Logout (disconnect) functionality
logoutButton.addEventListener("click", () => {
    // Clear the user account from localStorage and hide the details
    localStorage.removeItem('userAccount');
    userAccount = null;
    walletAddress.innerText = '';
    userDetails.style.display = 'none';
    console.log("User disconnected.");
});
