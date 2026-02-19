document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // request fresh data to avoid stale cache
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // remove existing options to prevent duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup with delete icons
        let participantsMarkup = "<p><strong>Participants:</strong></p>";
        if (details.participants && details.participants.length > 0) {
          participantsMarkup += `<ul class="participants-list">
            ${details.participants.map(p => `<li>${p} <span class="remove-participant" data-activity="${name}" data-email="${p}">&times;</span></li>`).join("\n            ")}
          </ul>`;
        } else {
          participantsMarkup += `<p class="no-participants">No participants yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsMarkup}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    // Get reCAPTCHA token
    const recaptchaToken = grecaptcha.getResponse();
    if (!recaptchaToken) {
      messageDiv.textContent = "Please complete the CAPTCHA.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ recaptcha_token: recaptchaToken })
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        grecaptcha.reset();

        // re-fetch activities to update participant lists and availability
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Attach listener for delete icons (event delegation)
  activitiesList.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-participant")) {
      const activity = e.target.dataset.activity;
      const email = e.target.dataset.email;

      if (confirm(`Remove ${email} from ${activity}?`)) {
        try {
          const resp = await fetch(
            `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
            { method: "DELETE" }
          );
          if (resp.ok) {
            fetchActivities();
          } else {
            const err = await resp.json();
            console.error("Failed to remove participant:", err);
          }
        } catch (err) {
          console.error("Error removing participant:", err);
        }
      }
    }
  });

  // Initialize app
  fetchActivities();
});
