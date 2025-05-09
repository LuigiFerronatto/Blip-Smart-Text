/**
 * scripts/welcome.js
 * Handles interaction on the welcome page
 */

document.addEventListener('DOMContentLoaded', () => {
    // Close welcome page when Get Started is clicked
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
        window.close();
      });
    }
  });