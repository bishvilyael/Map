const API_URL =
  "https://script.google.com/macros/s/AKfycbyOmwCSFitXC9WnNHm52a56PhbCKKbrI3R5Dtr16-rthSIvT-3n_j3N8FSZwSSD1yqG0g/exec";
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
  emailInput.placeholder = "";
  publishInput.checked = false;

  pointsInfo.textContent = "";
  publishHint.classList.add("hidden");
  publishHint.textContent = "";

  currentBadgeNo = null;
  originalEmail = "";
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
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateEmail",
        badgeNo: currentBadgeNo,
        email: email,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      showError("עדכון האימייל נכשל: " + (data.error || ""));
      return;
    }

    originalEmail = email;
    showOk("האימייל עודכן ברשימה");
  } catch (err) {
    showError("שגיאה בעדכון האימייל: " + (err.message || err));
  } finally {
    updateEmailBtn.disabled = !isValidEmail(emailInput.value.trim());
    updateEmailBtn.textContent = "עדכון אימייל";
    validateReadyToSubmit();
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
      showError("שליחת הבקשה נכשלה: " + (data.error || data.notifyError || ""));
      return;
    }

    if (data.reqId) {
      showOk(
        "הבקשה נשלחה בהצלחה. מספר הבקשה: " +
          data.reqId +
          "\n" +
          "הודעת מייל עם פרטי הבקשה נשלחה אליך.\n" +
          "הודעה נוספת עם קישור למפה תשלח בסיום הטיפול.",
      );
    } else {
      showOk(
        "הבקשה נשלחה בהצלחה\n" +
          "הודעת מייל עם פרטי הבקשה נשלחה אליך.\n" +
          "הודעה נוספת עם קישור למפה תשלח בסיום הטיפול.",
      );
    }

    resetBtn.classList.add("hidden");
    checkBtn.classList.remove("hidden");
    badgeInput.value = "";
    submitBtn.textContent = "שליחת בקשה";
    lockForm();
  } catch (err) {
    showError("שגיאה בשליחת הבקשה: " + (err.message || err));
    submitBtn.textContent = "שליחת בקשה";
    validateReadyToSubmit();
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
    publishHint.textContent = "המפה תוכל להופיע באתר המפות האישיות";
    publishHint.className = "publish-hint ok";
  } else {
    publishHint.textContent = "קישור למפה ישלח רק אליך";
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
