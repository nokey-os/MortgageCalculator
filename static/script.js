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

const ratioChart = document.getElementById("ratioChart");
const paymentModal = document.getElementById("paymentModal");
const openPaymentChartBtn = document.getElementById("openPaymentChart");
const closePaymentChartBtn = document.getElementById("closePaymentChart");
const paymentScheduleCanvas = document.getElementById("paymentScheduleChart");
const modeButtons = document.querySelectorAll(".mode-btn");
const paymentTableBody = document.getElementById("paymentTableBody");

if (ratioChart) {
  const principal = Number(ratioChart.dataset.principal || 0);
  const interest = Number(ratioChart.dataset.interest || 0);
  const total = principal + interest;

  if (total > 0) {
    const ctx = ratioChart.getContext("2d");
    const centerX = ratioChart.width / 2;
    const centerY = ratioChart.height / 2;
    const radius = 110;
    const lineWidth = 38;
    const principalAngle = (principal / total) * Math.PI * 2;
    const startAngle = -Math.PI / 2;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.arc(centerX, centerY, radius - lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#22d3ee";
    ctx.arc(
      centerX,
      centerY,
      radius - lineWidth / 2,
      startAngle,
      startAngle + principalAngle,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#f59e0b";
    ctx.arc(
      centerX,
      centerY,
      radius - lineWidth / 2,
      startAngle + principalAngle,
      startAngle + Math.PI * 2,
    );
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.font = "bold 22px Segoe UI";
    ctx.fillText(`${Math.round((principal / total) * 100)}%`, centerX, centerY - 4);
    ctx.font = "14px Segoe UI";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("тело кредита", centerX, centerY + 18);
  }
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
  const formatMoney = (value) => {
    const rounded = Number(value || 0).toFixed(2);
    const [intPart, fraction] = rounded.split(".");
    const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${withSpaces}.${fraction} ₽`;
  };

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
