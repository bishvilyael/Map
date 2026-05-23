function getSubmitButtonBaseText() {
  return isNewRequestMode() ? "שליחת בקשה" : "עדכון בקשה";
}

function updateSubmitButtonText() {
  submitBtn.textContent = getSubmitButtonBaseText();
}

function getSelectedRequestPublishAllowed() {
  const selectedRequest = getSelectedStatusRequest();

  if (!selectedRequest) {
    return false;
  }

  return String(selectedRequest.publishAllowed || "").trim() === "כן";
}

function setSelectedPublishBaseline() {
  selectedInitialPublishAllowed = publishInput.checked;
  publishTouched = false;
}

function isPublishChanged() {
  if (selectedInitialPublishAllowed === null) {
    return false;
  }

  return publishInput.checked !== selectedInitialPublishAllowed;
}

function isCountsChangedFromSelectedRequest() {
  const selectedRequest = getSelectedStatusRequest();

  if (!selectedRequest) {
    return false;
  }

  return (
    Number(selectedRequest.pointCount || 0) !== Number(currentPointCount || 0) ||
    Number(selectedRequest.childCount || 0) !== Number(currentChildCount || 0)
  );
}

function isNewRequestMode() {
  if (!currentStatusList || currentStatusList.length === 0) {
    return true;
  }

  const selectedRequest = getSelectedStatusRequest();

  if (!selectedRequest) {
    return false;
  }

  return (
    String(selectedRequest.status || "").trim() === "הושלם" &&
    isCountsChangedFromSelectedRequest()
  );
}

function hasSubmitActionNeeded() {
  if (!currentBadgeNo) {
    return false;
  }

  if (!currentStatusList || currentStatusList.length === 0) {
    return true;
  }

  if (isNewRequestMode()) {
    return true;
  }

  return isPublishChanged();
}