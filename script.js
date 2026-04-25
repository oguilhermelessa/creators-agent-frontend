const form = document.querySelector("#lead-form");
const statusEl = document.querySelector("#form-status");
const demoTabs = Array.from(document.querySelectorAll(".demo-tab"));
const conversationSection = document.querySelector("#simulador");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let chatAnimationFrame = 0;
const thankYouPage = "obrigado.html";
const appConfig = window.AGENTE_DIY_CONFIG || {};

const demoContent = {
  lead: {
    title: "Transformar curiosos em conversas úteis.",
    copy:
      "Seu agente responde com seu repertório, entende o momento da pessoa e cria o próximo passo sem você estar online.",
    steps: [
      "Receber a pergunta do público",
      "Responder com sua voz",
      "Levar para lista, DM ou oferta",
    ],
  },
  paid: {
    title: "Descobrir se sua audiência pagaria por mais acesso.",
    copy:
      "Antes de construir um produto inteiro, você pode testar interesse por assinatura, venda avulsa, mentoria ou conteúdo premium.",
    steps: [
      "Entregar uma amostra gratuita",
      "Mostrar o próximo nível",
      "Medir intenção de compra",
    ],
  },
  community: {
    title: "Criar uma porta de entrada para sua comunidade.",
    copy:
      "Ele recebe novos seguidores, entende o perfil de cada pessoa e encaminha quem tem fit para o grupo, canal ou conversa certa.",
    steps: [
      "Entender o momento da pessoa",
      "Recomendar conteúdo ou grupo",
      "Convidar para o próximo passo",
    ],
  },
};

function getFormData(formElement) {
  const data = new FormData(formElement);
  return {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    whatsapp: String(data.get("whatsapp") || "").trim(),
    niche: String(data.get("niche") || "").trim(),
    audience: String(data.get("audience") || "").trim(),
    goal: String(data.get("goal") || "").trim(),
    createdAt: new Date().toISOString(),
  };
}

function persistLeadLocally(lead) {
  const storageKey = "agente-diy-access-leads";
  const current = JSON.parse(localStorage.getItem(storageKey) || "[]");
  current.push(lead);
  localStorage.setItem(storageKey, JSON.stringify(current));
}

function getLeadEndpoint() {
  if (window.location.protocol === "file:") return "";
  return String(appConfig.leadEndpoint || "").trim();
}

async function persistLead(lead) {
  const endpoint = getLeadEndpoint();

  if (!endpoint) {
    persistLeadLocally(lead);
    return "local";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    throw new Error("Lead endpoint failed");
  }

  return "remote";
}

function setFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  const error = document.querySelector(`#${fieldName}-error`);

  if (!field || !error) return;

  const controls = field instanceof RadioNodeList ? Array.from(field) : [field];
  controls.forEach((control) => {
    control.setAttribute("aria-invalid", message ? "true" : "false");
    if (message) {
      control.setAttribute("aria-describedby", `${fieldName}-error`);
    } else {
      control.removeAttribute("aria-describedby");
    }
  });
  error.textContent = message;
}

function validateLeadForm() {
  const data = getFormData(form);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const errors = {
    name: data.name ? "" : "Informe seu nome.",
    email: emailLooksValid ? "" : "Informe um e-mail válido.",
    whatsapp: "",
    niche: data.niche ? "" : "Conte sobre o que você cria.",
    audience: data.audience ? "" : "Selecione onde está sua audiência.",
    goal: data.goal ? "" : "Escolha o primeiro uso do seu agente.",
  };

  Object.entries(errors).forEach(([field, message]) => setFieldError(field, message));
  return errors;
}

function focusFirstInvalid(errors) {
  const firstInvalid = Object.keys(errors).find((field) => errors[field]);
  if (!firstInvalid) return;

  const target = form.elements[firstInvalid];
  const control = target instanceof RadioNodeList ? target[0] : target;
  control?.focus();
}

function updateDemo(mode) {
  const content = demoContent[mode];
  if (!content) return;

  document.querySelector("#demo-title").textContent = content.title;
  document.querySelector("#demo-copy").textContent = content.copy;
  document.querySelector("#demo-step-1").textContent = content.steps[0];
  document.querySelector("#demo-step-2").textContent = content.steps[1];
  document.querySelector("#demo-step-3").textContent = content.steps[2];

  demoTabs.forEach((tab) => {
    const isActive = tab.dataset.demo === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

demoTabs.forEach((tab) => {
  tab.addEventListener("click", () => updateDemo(tab.dataset.demo));
});

function setChatStep(step) {
  if (!conversationSection) return;
  conversationSection.dataset.chatStep = String(step);
}

function updateChatSimulator() {
  chatAnimationFrame = 0;
  if (!conversationSection) return;

  if (motionPreference.matches) {
    setChatStep(5);
    return;
  }

  const rect = conversationSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const headerHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
  const scrollableDistance = Math.max(1, rect.height - viewportHeight);
  const progress = Math.min(1, Math.max(0, (headerHeight + 12 - rect.top) / scrollableDistance));
  const stepThresholds = [0.1, 0.46, 0.58, 0.66, 0.9];
  const step = stepThresholds.findIndex((threshold) => progress < threshold);
  setChatStep(step === -1 ? 5 : step);
}

function requestChatUpdate() {
  if (chatAnimationFrame) return;
  chatAnimationFrame = window.requestAnimationFrame(updateChatSimulator);
}

if (conversationSection) {
  updateChatSimulator();
  window.addEventListener("scroll", requestChatUpdate, { passive: true });
  window.addEventListener("resize", requestChatUpdate);
  motionPreference.addEventListener?.("change", updateChatSimulator);
}

function getThankYouUrl() {
  const url = new URL(thankYouPage, window.location.href);
  return url.href;
}

form?.addEventListener("input", (event) => {
  const name = event.target?.name;
  if (name) setFieldError(name, "");
});

form?.addEventListener("change", (event) => {
  const name = event.target?.name;
  if (name) setFieldError(name, "");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.classList.remove("is-error");

  const errors = validateLeadForm();
  if (Object.values(errors).some(Boolean)) {
    statusEl.textContent = "Revise os campos marcados para receber o convite.";
    statusEl.classList.add("is-error");
    focusFirstInvalid(errors);
    return;
  }

  const lead = getFormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  try {
    await persistLead(lead);
    form.reset();
    window.location.href = thankYouPage;
  } catch (error) {
    statusEl.textContent = "Não foi possível registrar agora. Tente novamente em alguns instantes.";
    statusEl.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar na lista de espera";
  }
});
