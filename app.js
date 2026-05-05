const API_URL =
  "https://script.google.com/macros/s/AKfycbzFfdN5HYrMfHGE8tCpIf4v8iSjTwE2KrTy98ZBNfyAxfIUUnhr_2E_3L8cYumZAGAf/exec";
const POINTS_JSON_URL = "./badge-points-count.json";

const badgeInput = document.getElementById("badgeNo");
const nameInput = document.getElementById("nameHe");
const emailInput = document.getElementById("email");
const publishInput = document.getElementById("publishAllowed");

const checkBtn = document.getElementById("checkBtn");
const resetBtn = document.getElementById("resetBtn");
const updateEmailBtn = document.getElementById("updateEmailBtn");
const submitBtn = document.getElementById("submitBtn");

const msg = document.getElementById("msg");
const pointsInfo = document.getElementById("pointsInfo");
const publishHint = document.getElementById("publishHint");

let pointsData = {};
let currentBadgeNo = null;
let originalEmail = "";
let currentHasPoints = false;
let formReady = false;

init();

async function init() {
  lockForm();
  await loadPointsJson();
}

async function loadPointsJson() {
  try {
    const res = await fetch(POINTS_JSON_URL, { cache: "no-store" });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    pointsData = await res.json();
  } catch (err) {
    showError("שגיאה בטעינת נתוני הנקודות. לא ניתן לשלוח בקשה כרגע.");
    checkBtn.disabled = true;
  }
}

function lockForm() {
  badgeInput.disabled = false;
  checkBtn.disabled = false;

  nameInput.disabled = true;
  emailInput.disabled = true;
  publishInput.disabled = true;
  updateEmailBtn.disabled = true;
  submitBtn.disabled = true;

  nameInput.value = "";
  emailInput.value = "";
  emailInput.placeholder = "";
  publishInput.checked = false;

  pointsInfo.textContent = "";
  publishHint.classList.add("hidden");
  publishHint.textContent = "";

  currentBadgeNo = null;
  originalEmail = "";
  currentHasPoints = false;
  formReady = false;
}

checkBtn.addEventListener("click", checkBadge);

badgeInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    checkBadge();
  }
});

resetBtn.addEventListener("click", function () {
  badgeInput.value = "";
  resetBtn.classList.add("hidden");
  checkBtn.classList.remove("hidden");
  clearMsg();
  lockForm();
  badgeInput.focus();
});

emailInput.addEventListener("input", function () {
  validateReadyToSubmit();
  updateEmailBtn.disabled = !isValidEmail(emailInput.value.trim());
});

publishInput.addEventListener("change", updatePublishHint);

async function checkBadge() {
  const badgeNo = normalizeBadgeNoClient(badgeInput.value);

  clearMsg();
  pointsInfo.textContent = "";
  publishHint.classList.add("hidden");
  publishHint.textContent = "";

  if (!badgeNo) {
    showError("יש להזין מספר יעל");
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = "בודק...";

  try {
    const userRes = await fetch(
      API_URL + "?badgeNo=" + encodeURIComponent(badgeNo),
      { cache: "no-store" }
    );
    const userData = await userRes.json();

    if (!userData.ok || !userData.found) {
      showError("מספר יעל לא נמצא ברשימה. לא ניתן להמשיך.");
      return;
    }

    const points = pointsData[badgeNo];

    if (!points) {
      showError("לא נמצאו נקודות עבור מספר יעל זה. לא ניתן להמשיך.");
      return;
    }

    const parentCount = Number(points.parent || 0);
    const childrenCount = Number(points.children || 0);

    if (parentCount === 0 && childrenCount === 0) {
      showError("לא נמצאו נקודות עבור מספר יעל זה. לא ניתן להמשיך.");
      return;
    }

    currentBadgeNo = badgeNo;
    currentHasPoints = true;

    nameInput.value = (userData.person && userData.person.nameHe) ? userData.person.nameHe : "";
    emailInput.value = (userData.person && userData.person.email) ? userData.person.email : "";
    originalEmail = emailInput.value.trim();

    badgeInput.value = badgeNo;
    badgeInput.disabled = true;
    checkBtn.classList.add("hidden");
    resetBtn.classList.remove("hidden");

    emailInput.disabled = false;
    publishInput.disabled = false;

    publishInput.checked = false;
    publishHint.classList.remove("hidden");
    updatePublishHint();

    if (!emailInput.value.trim()) {
      emailInput.placeholder = "חובה לרשום כתובת מייל תקינה";
    }

    if (childrenCount > 0) {
      pointsInfo.textContent =
        "נמצאו " +
        parentCount +
        " נקודות שלך במפה ועוד " +
        childrenCount +
        " נלווים.";
    } else {
      pointsInfo.textContent = "נמצאו " + parentCount + " נקודות שלך במפה.";
    }

    updateEmailBtn.disabled = !isValidEmail(emailInput.value.trim());

    showOk("הפרטים נמצאו. ניתן להשלים אימייל ולשלוח בקשה.");

    validateReadyToSubmit();
  } catch (err) {
    showError("שגיאה בבדיקת מספר יעל");
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "בדיקה";
  }
}

updateEmailBtn.addEventListener("click", async function () {
  const email = emailInput.value.trim();

  if (!currentBadgeNo || !isValidEmail(email)) {
    showError("יש לרשום כתובת מייל תקינה לפני עדכון");
    return;
  }

  updateEmailBtn.disabled = true;
  updateEmailBtn.textContent = "מעדכן...";

  try {
    const data = await postToApi({
      action: "updateEmail",
      badgeNo: currentBadgeNo,
      email: email,
    });

    if (!data.ok || !data.updated) {
      showError("עדכון האימייל נכשל");
      return;
    }

    originalEmail = email;
    showOk("האימייל עודכן ברשימה");
  } catch (err) {
    showError("שגיאה בעדכון האימייל");
  } finally {
    updateEmailBtn.disabled = !isValidEmail(emailInput.value.trim());
    updateEmailBtn.textContent = "עדכון אימייל";
  }
});

submitBtn.addEventListener("click", async function () {
  validateReadyToSubmit();

  if (!formReady) {
    showError("יש להשלים כתובת מייל תקינה לפני שליחה");
    return;
  }

  const email = emailInput.value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "שולח...";

  try {
    const data = await postToApi({
      action: "submitRequest",
      badgeNo: currentBadgeNo,
      nameHe: nameInput.value.trim(),
      email: email,
      publishAllowed: publishInput.checked,
    });

    if (!data.ok || !data.saved) {
      showError("שליחת הבקשה נכשלה");
      return;
    }

    if (data.notifySent) {
      showOk("הבקשה נשלחה בהצלחה");
    } else {
      showError("הבקשה נשמרה, אבל המייל למנהל לא נשלח. יש לבדוק הרשאות MailApp ועמודת NotifyError בגיליון הבקשות.");
      return;
    }

    resetBtn.classList.add("hidden");
    checkBtn.classList.remove("hidden");
    badgeInput.value = "";
    lockForm();
  } catch (err) {
    showError("שגיאה בשליחת הבקשה");
  } finally {
    submitBtn.textContent = "שליחת בקשה";
    validateReadyToSubmit();
  }
});

async function postToApi(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid JSON response: " + text);
  }
}

function validateReadyToSubmit() {
  const email = emailInput.value.trim();

  formReady =
    currentBadgeNo !== null &&
    nameInput.value.trim() !== "" &&
    isValidEmail(email) &&
    currentHasPoints === true;

  submitBtn.disabled = !formReady;
}

function updatePublishHint() {
  if (publishInput.checked) {
    publishHint.textContent = "המפה תוכל להופיע באתר המפות האישיות";
    publishHint.className = "publish-hint ok";
  } else {
    publishHint.textContent = "קישור למפה ישלח רק אליך";
    publishHint.className = "publish-hint warn";
  }
}

function normalizeBadgeNoClient(value) {
  return String(value || "")
    .trim()
    .replace(/\.0$/, "")
    .replace(/\s+/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showOk(text) {
  msg.textContent = text;
  msg.className = "msg ok";
}

function showError(text) {
  msg.textContent = text;
  msg.className = "msg error";
}

function clearMsg() {
  msg.textContent = "";
  msg.className = "msg";
}
