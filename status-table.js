function buildStatusTableHtml(list) {
  if (!list || list.length === 0) {
    return "";
  }

  let html = "";

  html += '<table class="status-table">';
	html += "<thead>";
		html += "<tr>";
		html += "<th>בקשה</th>";
		html += "<th>סטטוס</th>";
		html += "<th>הפצה</th>";
		html += "<th>נקודות</th>";
		html += "<th>נלווים</th>";
		html += "<th>תאריך בקשה</th>";
		html += "<th>תאריך עדכון</th>";
		html += "<th>תאריך סיום</th>";
		html += "<th>קישור</th>";
		html += "</tr>";
		html += "</thead>";

		html += "<tbody>";

		list.forEach(function (r) {
		  const selectedClass =
			String(r.reqId) === String(selectedReqId) ? " selected-status-row" : "";

		  html +=
			'<tr class="status-row' +
			selectedClass +
			'" onclick="selectStatusRequest(\'' +
			escapeAttr(r.reqId || "") +
			'\')">';

		  html += "<td>" + escapeHtml(r.reqId || "") + "</td>";
		  html += "<td>" + escapeHtml(r.status || "") + "</td>";
		  html += "<td>" + escapeHtml(r.publishAllowed || "") + "</td>";
		  html += "<td>" + escapeHtml(r.pointCount || "") + "</td>";
		  html += "<td>" + escapeHtml(r.childCount || "") + "</td>";
		  html += "<td>" + escapeHtml(r.reqDate || "") + "</td>";
		  html += "<td>" + escapeHtml(r.reqUpdate || "") + "</td>";
		  html += "<td>" + escapeHtml(r.reqComp || "") + "</td>";

		  if (r.mapUrl) {
			html +=
			  '<td><a href="' +
			  escapeAttr(r.mapUrl) +
			  '" target="_blank" rel="noopener">פתח מפה</a></td>';
		  } else {
			html += "<td></td>";
		  }

		  html += "</tr>";
		});

		html += "</tbody>";
  html += "</table>";

  return html;
}

function getSelectedStatusRequest() {
  if (!selectedReqId || !currentStatusList || currentStatusList.length === 0) {
    return null;
  }

  return (
    currentStatusList.find(function (r) {
      return String(r.reqId) === String(selectedReqId);
    }) || null
  );
}

function selectStatusRequest(reqId) {
  if (requestBusy) {
    return;
  }

  selectedReqId = reqId;
  updateSelectedReqTitle();

  const selectedRequest = getSelectedStatusRequest();

  if (selectedRequest) {
    publishInput.checked = getSelectedRequestPublishAllowed();
    updatePublishHint();
    setSelectedPublishBaseline();
  }

  statusTableWrap.innerHTML = buildStatusTableHtml(currentStatusList);
  validateReadyToSubmit();
}

function updateSelectedReqTitle() {
  if (selectedReqId) {
    selectedReqTitle.textContent = "(בקשה מס' " + selectedReqId + ")";
  } else {
    selectedReqTitle.textContent = "";
  }
}
async function refreshCurrentBadgeStatus(preferredReqId) {
  if (!currentBadgeNo) {
    return;
  }

  const res = await fetch(
    API_URL + "?badgeNo=" + encodeURIComponent(currentBadgeNo)
  );

  const userData = await res.json();

  currentStatusList = Array.isArray(userData.requestStatusList)
    ? userData.requestStatusList
    : [];

  if (currentStatusList.length > 0) {

    selectedReqId =
      preferredReqId ||
      selectedReqId ||
      currentStatusList[0].reqId;

    statusSection.classList.remove("hidden");
    toggleStatusBtn.classList.remove("hidden");
    toggleStatusBtn.textContent = "הסתר סטטוס בקשות";

    statusTableWrap.classList.remove("hidden");
    statusTableWrap.innerHTML = buildStatusTableHtml(currentStatusList);

    updateSelectedReqTitle();

    const selectedRequest = getSelectedStatusRequest();

    if (selectedRequest) {
      publishInput.checked = selectedRequest.publishAllowed === "כן";
      setSelectedPublishBaseline();
      updatePublishHint();
    }
  }
}