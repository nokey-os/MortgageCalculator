if (typeof console !== "undefined") console.log("script.js loaded");

const formatMoney = (value) => {
  const rounded = Number(value || 0).toFixed(2);
  const [intPart, fraction] = rounded.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces}.${fraction} ₽`;
};

const formatAmountInput = (rawValue) => {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const yearsInput = document.getElementById("years");
const yearsOutput = document.getElementById("years_output");
const amountInputs = [
  document.getElementById("property_price"),
  document.getElementById("down_payment"),
];

if (yearsInput && yearsOutput) {
  const syncYears = () => {
    yearsOutput.value = yearsInput.value;
    yearsOutput.textContent = yearsInput.value;
  };

  yearsInput.addEventListener("input", syncYears);
  syncYears();
}

const formatAmount = (rawValue) => {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

amountInputs.forEach((input) => {
  if (!input) {
    return;
  }

  input.addEventListener("input", () => {
    input.value = formatAmount(input.value);
  });

  input.value = formatAmount(input.value);
});

const modeToggleBtns = document.querySelectorAll(".mode-toggle-btn");
const rateField = document.getElementById("rateField");
const rateInput = document.getElementById("annual_rate");
const installmentInput = document.getElementById("installmentInput");
const submitBtn = document.getElementById("submitBtn");
const subtitle = document.getElementById("subtitle");

modeToggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!btn.dataset.mode) return;
    modeToggleBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const isInstallment = btn.dataset.mode === "installment";
    installmentInput.value = isInstallment ? "1" : "";
    rateField.style.display = isInstallment ? "none" : "";
    rateInput.required = !isInstallment;
    submitBtn.textContent = isInstallment ? "Рассчитать рассрочку" : "Рассчитать";
    subtitle.textContent = isInstallment
      ? "Рассчитайте ежемесячный платёж по рассрочке"
      : "Рассчитайте аннуитетный платеж и сумму переплаты";
  });
});

const ratioChart = document.getElementById("ratioChart");
const paymentModal = document.getElementById("paymentModal");
const openPaymentChartBtn = document.getElementById("openPaymentChart");
const closePaymentChartBtn = document.getElementById("closePaymentChart");
const paymentScheduleCanvas = document.getElementById("paymentScheduleChart");
const modeButtons = document.querySelectorAll(".chart-mode-switch .mode-btn");
const paymentTableBody = document.getElementById("paymentTableBody");

if (ratioChart) {
  const drawRatioChart = () => {
    const dpr = window.devicePixelRatio || 1;
    const cssSize = 280;
    const principal = Number(ratioChart.dataset.principal || 0);
    const interest = Number(ratioChart.dataset.interest || 0);
    const total = principal + interest;
    if (total <= 0) return;

    ratioChart.width = Math.round(cssSize * dpr);
    ratioChart.height = Math.round(cssSize * dpr);
    const ctx = ratioChart.getContext("2d");
    ctx.scale(dpr, dpr);

    const centerX = cssSize / 2;
    const centerY = cssSize / 2;
    const radius = 110;
    const lineWidth = 38;
    const innerRadius = radius - lineWidth / 2;
    const principalAngle = (principal / total) * Math.PI * 2;
    const startAngle = -Math.PI / 2;

    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#22d3ee";
    ctx.arc(centerX, centerY, innerRadius, startAngle, startAngle + principalAngle);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#f59e0b";
    ctx.arc(centerX, centerY, innerRadius, startAngle + principalAngle, startAngle + Math.PI * 2);
    ctx.stroke();

    const pct = Math.round((principal / total) * 100);
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 26px Segoe UI";
    ctx.fillText(`${pct}%`, centerX, centerY - 12);

    ctx.font = "13px Segoe UI";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("тело кредита", centerX, centerY + 14);
  };
  drawRatioChart();
}

if (paymentModal && openPaymentChartBtn && closePaymentChartBtn && paymentScheduleCanvas) {
  const chartSets = {
    yearly: {
      labels: JSON.parse(paymentScheduleCanvas.dataset.yearlyLabels || "[]"),
      principal: JSON.parse(paymentScheduleCanvas.dataset.yearlyPrincipal || "[]"),
      interest: JSON.parse(paymentScheduleCanvas.dataset.yearlyInterest || "[]"),
      title: "График платежей по годам",
    },
    monthly: {
      labels: JSON.parse(paymentScheduleCanvas.dataset.monthlyLabels || "[]"),
      principal: JSON.parse(paymentScheduleCanvas.dataset.monthlyPrincipal || "[]"),
      interest: JSON.parse(paymentScheduleCanvas.dataset.monthlyInterest || "[]"),
      title: "График платежей по месяцам",
    },
  };
  const modalTitle = document.getElementById("paymentModalTitle");
  let currentMode = "yearly";

  const drawPaymentScheduleChart = (canvas, xLabels, principal, interest, mode) => {
    if (!xLabels.length || !principal.length || !interest.length) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || canvas.width;
    const cssHeight = Math.round(cssWidth * 0.48);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padLeft = 62;
    const padBottom = 40;
    const padTop = 26;
    const padRight = 20;
    const chartWidth = cssWidth - padLeft - padRight;
    const chartHeight = cssHeight - padTop - padBottom;

    const maxValue =
      mode === "monthly"
        ? Math.max(...principal.map((value, idx) => value + interest[idx])) * 1.12
        : Math.max(...[...principal, ...interest]) * 1.12;
    const barGroupWidth = chartWidth / xLabels.length;
    const singleBarWidth = Math.min(18, (barGroupWidth - 10) / 2);

    ctx.strokeStyle = "rgba(203, 213, 225, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + chartHeight);
    ctx.lineTo(padLeft + chartWidth, padTop + chartHeight);
    ctx.stroke();

    const gridLines = 5;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "right";
    for (let i = 0; i <= gridLines; i += 1) {
      const y = padTop + (chartHeight / gridLines) * i;
      const value = maxValue - (maxValue / gridLines) * i;
      ctx.strokeStyle = "rgba(203, 213, 225, 0.14)";
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartWidth, y);
      ctx.stroke();

      const mlnValue = `${(value / 1000000).toFixed(1)}M`;
      ctx.fillText(mlnValue, padLeft - 8, y + 4);
    }

    xLabels.forEach((label, idx) => {
      const xBase = padLeft + idx * barGroupWidth + barGroupWidth / 2;
      const principalHeight = (principal[idx] / maxValue) * chartHeight;
      const interestHeight = (interest[idx] / maxValue) * chartHeight;
      const chartBottom = padTop + chartHeight;

      if (mode === "monthly") {
        // Stacked bars for monthly view:
        // principal is the bottom part, interest is above it.
        const stackedBarWidth = Math.min(22, barGroupWidth - 8);
        const principalTopY = chartBottom - principalHeight;
        const interestTopY = principalTopY - interestHeight;

        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(
          xBase - stackedBarWidth / 2,
          principalTopY,
          stackedBarWidth,
          principalHeight,
        );

        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(
          xBase - stackedBarWidth / 2,
          interestTopY,
          stackedBarWidth,
          interestHeight,
        );
      } else {
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(
          xBase - singleBarWidth - 2,
          chartBottom - principalHeight,
          singleBarWidth,
          principalHeight,
        );

        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(
          xBase + 2,
          chartBottom - interestHeight,
          singleBarWidth,
          interestHeight,
        );
      }

      const step = Math.max(1, Math.ceil(xLabels.length / 12));
      if (idx % step === 0 || idx === xLabels.length - 1) {
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.font = "11px Segoe UI";
        ctx.fillText(label.replace(" год", "").replace(" мес", ""), xBase, padTop + chartHeight + 16);
      }
    });

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "left";
    ctx.font = "12px Segoe UI";
    ctx.fillText("Голубой — тело кредита (снизу) | Оранжевый — проценты (сверху)", padLeft, 16);
  };

  const openModal = () => {
    paymentModal.classList.add("open");
    paymentModal.setAttribute("aria-hidden", "false");
    const data = chartSets[currentMode];
    if (modalTitle) {
      modalTitle.textContent = data.title;
    }
    drawPaymentScheduleChart(paymentScheduleCanvas, data.labels, data.principal, data.interest, currentMode);
    if (paymentTableBody) {
      paymentTableBody.innerHTML = data.labels
        .map((label, idx) => {
          const principal = data.principal[idx] || 0;
          const interest = data.interest[idx] || 0;
          const payment = principal + interest;
          return `<tr>
            <td>${label}</td>
            <td>${formatMoney(payment)}</td>
            <td>${formatMoney(interest)}</td>
            <td>${formatMoney(principal)}</td>
          </tr>`;
        })
        .join("");
    }
  };

  const closeModal = () => {
    paymentModal.classList.remove("open");
    paymentModal.setAttribute("aria-hidden", "true");
  };

  const exportBtn = document.getElementById("exportExcelBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const data = chartSets[currentMode];
      const headerMap = { "Период": 12, "Платеж": 16, "Проценты": 16, "Тело кредита": 16 };
      const rows = data.labels.map((label, idx) => [
        label,
        formatMoney(data.principal[idx] + data.interest[idx]),
        formatMoney(data.interest[idx]),
        formatMoney(data.principal[idx]),
      ]);
      let xml = '\uFEFF<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<?mso-application progid="Excel.Sheet"?>\n';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
      xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
      xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
      xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xml += ' <Worksheet ss:Name="График платежей">\n';
      xml += '  <Table>\n';
      const cols = Object.entries(headerMap);
      cols.forEach(([_, w]) => { xml += `   <Column ss:Width="${w * 50}"/>\n`; });
      const headerRow = Object.keys(headerMap);
      xml += '   <Row>\n';
      headerRow.forEach((h) => {
        xml += `    <Cell><Data ss:Type="String">${h}</Data></Cell>\n`;
      });
      xml += '   </Row>\n';
      rows.forEach((row) => {
        xml += '   <Row>\n';
        row.forEach((cell) => {
          const num = cell.replace(/\s/g, "").replace("₽", "").trim();
          const isNum = /^\d+(\.\d+)?$/.test(num);
          if (isNum) {
            xml += `    <Cell><Data ss:Type="Number">${num}</Data></Cell>\n`;
          } else {
            xml += `    <Cell><Data ss:Type="String">${cell}</Data></Cell>\n`;
          }
        });
        xml += '   </Row>\n';
      });
      xml += '  </Table>\n';
      xml += ' </Worksheet>\n';
      xml += '</Workbook>\n';
      const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `график_платежей_${currentMode}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  openPaymentChartBtn.addEventListener("click", openModal);
  closePaymentChartBtn.addEventListener("click", closeModal);
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newMode = button.dataset.mode === "monthly" ? "monthly" : "yearly";
      currentMode = newMode;
      modeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      if (modalTitle) {
        modalTitle.textContent = chartSets[currentMode].title;
      }
      drawPaymentScheduleChart(
        paymentScheduleCanvas,
        chartSets[currentMode].labels,
        chartSets[currentMode].principal,
        chartSets[currentMode].interest,
        currentMode,
      );
      if (paymentTableBody) {
        const data = chartSets[currentMode];
        paymentTableBody.innerHTML = data.labels
          .map((label, idx) => {
            const principal = data.principal[idx] || 0;
            const interest = data.interest[idx] || 0;
            const payment = principal + interest;
            return `<tr>
              <td>${label}</td>
              <td>${formatMoney(payment)}</td>
              <td>${formatMoney(interest)}</td>
              <td>${formatMoney(principal)}</td>
            </tr>`;
          })
          .join("");
      }
    });
  });
  paymentModal.addEventListener("click", (event) => {
    if (event.target === paymentModal) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && paymentModal.classList.contains("open")) {
      closeModal();
    }
  });
  window.addEventListener("resize", () => {
    if (paymentModal.classList.contains("open")) {
      drawPaymentScheduleChart(
        paymentScheduleCanvas,
        chartSets[currentMode].labels,
        chartSets[currentMode].principal,
        chartSets[currentMode].interest,
        currentMode,
      );
    }
  });
}

// --- Early repayment ---
const earlyRepaymentBtn = document.getElementById("earlyRepaymentBtn");
const earlyModal = document.getElementById("earlyModal");
const closeEarlyModal = document.getElementById("closeEarlyModal");
const earlyAmount = document.getElementById("earlyAmount");
const calcEarlyBtn = document.getElementById("calcEarlyBtn");
const earlyResult = document.getElementById("earlyResult");
const earlyTableBody = document.getElementById("earlyTableBody");
const earlyNewPayment = document.getElementById("earlyNewPayment");
const earlyNewMonths = document.getElementById("earlyNewMonths");
const earlyNewOverpayment = document.getElementById("earlyNewOverpayment");
const reducePaymentCb = document.getElementById("reducePayment");
const reduceTermCb = document.getElementById("reduceTerm");
const earlyBalanceDisplay = document.getElementById("earlyBalanceDisplay");

const resultDataTag = document.getElementById("resultData");
const resultData = resultDataTag ? JSON.parse(resultDataTag.textContent) : null;

if (earlyAmount) {
  earlyAmount.addEventListener("input", () => {
    earlyAmount.value = formatAmountInput(earlyAmount.value);
  });
}

if (reducePaymentCb && reduceTermCb) {
  reducePaymentCb.addEventListener("change", () => {
    if (reducePaymentCb.checked) reduceTermCb.checked = false;
  });
  reduceTermCb.addEventListener("change", () => {
    if (reduceTermCb.checked) reducePaymentCb.checked = false;
  });
}

if (earlyRepaymentBtn && earlyModal && closeEarlyModal) {
  const openEarlyModal = () => {
    earlyResult.style.display = "none";
    earlyAmount.value = "";
    reducePaymentCb.checked = true;
    reduceTermCb.checked = false;
    earlyModal.classList.add("open");
    earlyModal.setAttribute("aria-hidden", "false");
    if (earlyBalanceDisplay && resultData) {
      earlyBalanceDisplay.textContent = formatMoney(resultData.loan_amount);
    }
  };

  const closeEarlyModalFn = () => {
    earlyModal.classList.remove("open");
    earlyModal.setAttribute("aria-hidden", "true");
  };

  earlyRepaymentBtn.addEventListener("click", () => {
    openEarlyModal();
  });

  closeEarlyModal.addEventListener("click", closeEarlyModalFn);
  earlyModal.addEventListener("click", (event) => {
    if (event.target === earlyModal) closeEarlyModalFn();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && earlyModal.classList.contains("open")) closeEarlyModalFn();
  });
}

if (calcEarlyBtn) {
  calcEarlyBtn.addEventListener("click", async () => {
    const rawAmount = earlyAmount.value.replace(/\s/g, "");
    if (!rawAmount || Number(rawAmount) <= 0) {
      alert("Введите сумму досрочного погашения.");
      return;
    }
    const mode = reduceTermCb.checked ? "reduce_term" : "reduce_payment";

    if (!resultData) return;
    try {
      const resp = await fetch("/early-repayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: resultData.loan_amount,
          remaining_months: resultData.years * 12,
          annual_rate: resultData.annual_rate,
          early_amount: rawAmount,
          mode,
        }),
      });
      const data = await resp.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      earlyNewPayment.textContent = formatMoney(data.new_payment);
      const years = Math.floor(data.new_months / 12);
      const months = data.new_months % 12;
      let termText = "";
      if (years > 0) termText += `${years} г `;
      termText += `${months} мес`;
      earlyNewMonths.textContent = termText;
      earlyNewOverpayment.textContent = formatMoney(data.new_overpayment);

      if (earlyTableBody && data.schedule) {
        earlyTableBody.innerHTML = data.schedule
          .map((row) => `<tr>
            <td>${row.label}</td>
            <td>${formatMoney(row.payment)}</td>
            <td>${formatMoney(row.interest)}</td>
            <td>${formatMoney(row.principal)}</td>
            <td>${formatMoney(row.balance)}</td>
          </tr>`)
          .join("");
      }

      earlyResult.style.display = "";
    } catch (e) {
      alert("Ошибка при расчёте. Попробуйте снова.");
    }
  });
}
