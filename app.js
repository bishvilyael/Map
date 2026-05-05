const API_URL =
  "PUT_YOUR_WEB_APP_URL_HERE";
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
let formReady = false;

init();

async function init() {
  lockForm();
  await loadPointsJson();
}

async function loadPointsJson() {
  try {
    const res = await fetch(POINTS_JSON_URL);
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
  publishInput.checked = false;

  pointsInfo.textContent = "";
  publishHint.classList.add("hidden");
  publishHint.textContent = "";

  currentBadgeNo = null;
  originalEmail = "";
  formReady = false;
}

checkBtn.addEventListener("click", checkBadge);

async function checkBadge() {
  const badgeNo = badgeInput.value.trim();

  clearMsg();
  pointsInfo.textContent = "";

  if (!badgeNo) {
    showError("יש להזין מספר יעל");
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = "בודק...";

  try {
    const userRes = await fetch(
      API_URL + "?badgeNo=" + encodeURIComponent(badgeNo),
    );
    const userData = await userRes.json();

    if (!userData.ok || !userData.found) {
      showError("מספר יעל לא נמצא ברשימה. לא ניתן להמשיך.");
      return;
    }

    const points = pointsData[badgeNo];

    if (!points) {
      showError("לא נמצאו נקודות עבור מספר יעל זה.");
      return;
    }

    const parentCount = Number(points.parent || 0);
    const childrenCount = Number(points.children || 0);

    if (parentCount === 0 && childrenCount === 0) {
      showError("לא נמצאו נקודות עבור מספר יעל זה.");
      return;
    }

    currentBadgeNo = badgeNo;

    nameInput.value = userData.person.nameHe || "";
    emailInput.value = userData.person.email || "";
    originalEmail = emailInput.value.trim();

    badgeInput.disabled = true;
    checkBtn.classList.add("hidden");
    resetBtn.classList.remove("hidden");

    emailInput.disabled = false;
    publishInput.disabled = false;

    publishInput.checked = false;
    publishHint.classList.remove("hidden");
    updatePublishHint();

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

    showOk("הפרטים נמצאו. ניתן לשלוח בקשה.");

    validateReadyToSubmit();
  } catch (err) {
    showError("שגיאה בבדיקת מספר יעל");
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "בדיקה";
  }
}

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
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitRequest",
        badgeNo: currentBadgeNo,
        nameHe: nameInput.value.trim(),
        email: email,
        publishAllowed: publishInput.checked,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      showError("שליחת הבקשה נכשלה");
      return;
    }

    showOk("הבקשה נשלחה בהצלחה. מספר הבקשה: " + data.reqId);

    submitBtn.textContent = "נשלח";
    submitBtn.disabled = true;

    lockForm();
  } catch (err) {
    showError("שגיאה בשליחת הבקשה");
  }
});

function validateReadyToSubmit() {
  const email = emailInput.value.trim();

  formReady =
    currentBadgeNo !== null &&
    nameInput.value.trim() !== "" &&
    isValidEmail(email);

  submitBtn.disabled = !formReady;
}

function updatePublishHint() {
  if (publishInput.checked) {
    publishHint.textContent = "המפה תוכל להופיע באתר";
    publishHint.className = "publish-hint ok";
  } else {
    publishHint.textContent = "קישור ישלח רק אליך";
    publishHint.className = "publish-hint warn";
  }
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