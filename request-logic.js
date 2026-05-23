function getSubmitButtonBaseText() {
  return isNewRequestMode() ? "שליחת בקשה" : "עדכון בקשה";
}

function updateSubmitButtonText() {
  submitBtn.textContent = getSubmitButtonBaseText();
}

function normalizeStatus(value) {
  return String(value || "").trim();
}

function isDeletedStatus(value) {
  return normalizeStatus(value) === "נמחק";
}

function isDeletedRequest(request) {
  return request && isDeletedStatus(request.status);
}

function getActiveStatusList() {
  if (!currentStatusList || currentStatusList.length === 0) {
    return [];
  }

  return currentStatusList.filter(function (r) {
    return !isDeletedRequest(r);
  });
}

function hasActiveRequests() {
  return getActiveStatusList().length > 0;
}

function getDefaultSelectableReqId() {
  const activeList = getActiveStatusList();

  if (activeList.length === 0) {
    return null;
  }

  return activeList[0].reqId || null;
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

  if (!selectedRequest || isDeletedRequest(selectedRequest)) {
    return false;
  }

  return (
    Number(selectedRequest.pointCount || 0) !== Number(currentPointCount || 0) ||
    Number(selectedRequest.childCount || 0) !== Number(currentChildCount || 0)
  );
}

function isNewRequestMode() {
  return !hasActiveRequests();
}

function hasSubmitActionNeeded() {
  if (!currentBadgeNo) {
    return false;
  }

  if (isNewRequestMode()) {
    return true;
  }

  const selectedRequest = getSelectedStatusRequest();

  if (!selectedRequest || isDeletedRequest(selectedRequest)) {
    return false;
  }

  return isPublishChanged() || isCountsChangedFromSelectedRequest();
}

function canDeleteSelectedRequest() {
  const selectedRequest = getSelectedStatusRequest();

  return (
    currentBadgeNo !== null &&
    selectedRequest !== null &&
    !isDeletedRequest(selectedRequest) &&
    !requestBusy
  );
}

function canDeleteAnyRequest() {
  return currentBadgeNo !== null && hasActiveRequests() && !requestBusy;
}
