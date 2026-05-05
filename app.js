const API_URL = 'https://script.google.com/macros/s/AKfycbxBiYALrtPamzhLo-zM8TRXqkMi0e2i41h2GvQjjpfd25cgSdAU-E1px0nPZRYBDulO/exec';
const POINTS_JSON_URL = './badge-points-count.json';

const badgeInput = document.getElementById('badgeNo');
const nameInput = document.getElementById('nameHe');
const emailInput = document.getElementById('email');
const publishInput = document.getElementById('publishAllowed');

const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetBtn');
const updateEmailBtn = document.getElementById('updateEmailBtn');
const submitBtn = document.getElementById('submitBtn');

const msg = document.getElementById('msg');
const pointsInfo = document.getElementById('pointsInfo');
const publishHint = document.getElementById('publishHint');

let pointsData = {};
let currentBadgeNo = null;
let formReady = false;

init();

async function init() {
  lockForm();
  await loadPoints();
}

async function loadPoints() {
  try {
    const res = await fetch(POINTS_JSON_URL);
    pointsData = await res.json();
  } catch {
    showError('שגיאה בטעינת נתונים');
  }
}

function lockForm() {
  nameInput.value = '';
  emailInput.value = '';
  emailInput.placeholder = '';

  nameInput.disabled = true;
  emailInput.disabled = true;
  publishInput.disabled = true;
  updateEmailBtn.disabled = true;
  submitBtn.disabled = true;

  publishInput.checked = false;

  publishHint.classList.add('hidden');
  publishHint.textContent = '';

  pointsInfo.textContent = '';

  currentBadgeNo = null;
}

checkBtn.onclick = checkBadge;

resetBtn.onclick = () => {
  badgeInput.value = '';
  resetBtn.classList.add('hidden');
  checkBtn.classList.remove('hidden');
  lockForm();
};

async function checkBadge() {

  const badgeNo = badgeInput.value.trim();

  if (!badgeNo) {
    showError('יש להזין מספר יעל');
    return;
  }

  try {
    const res = await fetch(API_URL + '?badgeNo=' + badgeNo);
    const data = await res.json();

    if (!data.found) {
      showError('מספר לא קיים');
      return;
    }

    const points = pointsData[badgeNo];

    if (!points) {
      showError('אין נקודות');
      return;
    }

    const parent = points.parent || 0;
    const children = points.children || 0;

    if (parent === 0 && children === 0) {
      showError('אין נקודות');
      return;
    }

    currentBadgeNo = badgeNo;

    nameInput.value = data.person.nameHe;
    emailInput.value = data.person.email || '';

    nameInput.disabled = true;
    emailInput.disabled = false;
    publishInput.disabled = false;

    updateEmailBtn.disabled = false;

    publishHint.classList.remove('hidden');

    if (children > 0) {
      pointsInfo.textContent = `נמצאו ${parent} נקודות שלך במפה ועוד ${children} נלווים.`;
    } else {
      pointsInfo.textContent = `נמצאו ${parent} נקודות שלך במפה.`;
    }

    updatePublishHint();

    checkBtn.classList.add('hidden');
    resetBtn.classList.remove('hidden');

    validate();

  } catch {
    showError('שגיאה');
  }
}

publishInput.onchange = updatePublishHint;

function updatePublishHint() {
  if (publishInput.checked) {
    publishHint.textContent = 'המפה תופיע באתר';
    publishHint.className = 'publish-hint ok';
  } else {
    publishHint.textContent = 'קישור למפה ישלח רק אליך';
    publishHint.className = 'publish-hint warn';
  }
}

emailInput.oninput = validate;

function validate() {
  const email = emailInput.value.trim();
  formReady = currentBadgeNo && email.includes('@');
  submitBtn.disabled = !formReady;
}

updateEmailBtn.onclick = () => {
  showOk('האימייל עודכן (בדיקה בלבד)');
};

submitBtn.onclick = () => {
  showOk('נשלח (בדיקה)');
};

function showError(t) {
  msg.textContent = t;
  msg.className = 'msg error';
}

function showOk(t) {
  msg.textContent = t;
  msg.className = 'msg ok';
}