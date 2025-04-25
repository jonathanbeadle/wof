document.addEventListener('DOMContentLoaded', () => {
    const passwordPrompt = document.getElementById('password-prompt');
    const adminControls = document.getElementById('admin-controls');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const passwordError = document.getElementById('password-error');
    const modeSelect = document.getElementById('mode-select');
    const saveModeButton = document.getElementById('save-mode');
    const saveStatus = document.getElementById('save-status');

    // --- Configuration ---
    const ADMIN_PASSWORD = 'mediawall'; // IMPORTANT: This is visible in the source code!
    const MODE_STORAGE_KEY = 'wheelMode';
    // ---------------------

    // Check if already authenticated (e.g., page refresh)
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        showAdminControls();
    }

    passwordSubmit.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminAuthenticated', 'true'); // Use sessionStorage for temporary auth
            showAdminControls();
            passwordError.textContent = '';
        } else {
            passwordError.textContent = 'Incorrect password.';
            passwordInput.value = ''; // Clear the input
        }
    });

    saveModeButton.addEventListener('click', () => {
        const selectedMode = modeSelect.value;
        localStorage.setItem(MODE_STORAGE_KEY, selectedMode);
        saveStatus.textContent = `Mode saved as: ${modeSelect.options[modeSelect.selectedIndex].text}`;
        setTimeout(() => { saveStatus.textContent = ''; }, 3000); // Clear status after 3 seconds
    });

    function showAdminControls() {
        passwordPrompt.style.display = 'none';
        adminControls.style.display = 'block';
        loadCurrentMode();
    }

    function loadCurrentMode() {
        const currentMode = localStorage.getItem(MODE_STORAGE_KEY) || 'standard'; // Default to standard
        modeSelect.value = currentMode;
    }
});
