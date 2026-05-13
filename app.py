from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from flask import Flask, render_template, request

app = Flask(__name__)
MAX_MORTGAGE_YEARS = 30


@dataclass
class MortgageResult:
    property_price: Decimal
    down_payment: Decimal
    years: int
    annual_rate: Decimal
    loan_amount: Decimal
    monthly_payment: Decimal
    total_payment: Decimal
    overpayment: Decimal
    schedule_labels: list[str]
    principal_by_year: list[float]
    interest_by_year: list[float]
    monthly_labels: list[str]
    principal_by_month: list[float]
    interest_by_month: list[float]


def to_decimal(value: str) -> Decimal:
    normalized = value.replace(" ", "").replace(",", ".")
    return Decimal(normalized)


def round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_mortgage(
    property_price: Decimal, down_payment: Decimal, years: int, annual_rate: Decimal
) -> MortgageResult:
    if property_price <= 0:
        raise ValueError("Стоимость недвижимости должна быть больше 0.")
    if down_payment < 0:
        raise ValueError("Первоначальный взнос не может быть отрицательным.")
    if down_payment >= property_price:
        raise ValueError("Первоначальный взнос должен быть меньше стоимости недвижимости.")
    if years <= 0:
        raise ValueError("Срок ипотеки должен быть больше 0.")
    if years > MAX_MORTGAGE_YEARS:
        raise ValueError(f"Максимальный срок ипотеки — {MAX_MORTGAGE_YEARS} лет.")
    if annual_rate <= 0:
        raise ValueError("Ставка должна быть больше 0.")

    loan_amount = property_price - down_payment
    months = years * 12
    monthly_rate = annual_rate / Decimal("12") / Decimal("100")

    factor = (Decimal("1") + monthly_rate) ** months
    monthly_payment = loan_amount * monthly_rate * factor / (factor - Decimal("1"))
    total_payment = monthly_payment * months
    overpayment = total_payment - loan_amount

    balance = loan_amount
    schedule_labels: list[str] = []
    principal_by_year: list[float] = []
    interest_by_year: list[float] = []
    monthly_labels: list[str] = []
    principal_by_month: list[float] = []
    interest_by_month: list[float] = []
    month_index = 0

    for year in range(1, years + 1):
        principal_year_sum = Decimal("0")
        interest_year_sum = Decimal("0")
        for _ in range(12):
            month_index += 1
            interest_payment = balance * monthly_rate
            principal_payment = monthly_payment - interest_payment
            if principal_payment > balance:
                principal_payment = balance
            balance -= principal_payment
            principal_year_sum += principal_payment
            interest_year_sum += interest_payment
            monthly_labels.append(f"{month_index} мес")
            principal_by_month.append(float(round_money(principal_payment)))
            interest_by_month.append(float(round_money(interest_payment)))
            if balance <= 0:
                balance = Decimal("0")
                break

        schedule_labels.append(f"{year} год")
        principal_by_year.append(float(round_money(principal_year_sum)))
        interest_by_year.append(float(round_money(interest_year_sum)))

        if balance <= 0:
            break

    return MortgageResult(
        property_price=round_money(property_price),
        down_payment=round_money(down_payment),
        years=years,
        annual_rate=annual_rate,
        loan_amount=round_money(loan_amount),
        monthly_payment=round_money(monthly_payment),
        total_payment=round_money(total_payment),
        overpayment=round_money(overpayment),
        schedule_labels=schedule_labels,
        principal_by_year=principal_by_year,
        interest_by_year=interest_by_year,
        monthly_labels=monthly_labels,
        principal_by_month=principal_by_month,
        interest_by_month=interest_by_month,
    )


@app.route("/", methods=["GET", "POST"])
def index():
    default_data = {
        "property_price": "8000000",
        "down_payment": "1500000",
        "years": "20",
        "annual_rate": "14.5",
    }

    form_data = default_data.copy()
    result = None
    error = None

    if request.method == "POST":
        form_data["property_price"] = request.form.get("property_price", "").strip()
        form_data["down_payment"] = request.form.get("down_payment", "").strip()
        form_data["years"] = request.form.get("years", "").strip()
        form_data["annual_rate"] = request.form.get("annual_rate", "").strip()

        try:
            result = calculate_mortgage(
                property_price=to_decimal(form_data["property_price"]),
                down_payment=to_decimal(form_data["down_payment"]),
                years=int(form_data["years"]),
                annual_rate=to_decimal(form_data["annual_rate"]),
            )
        except (InvalidOperation, ValueError) as exc:
            error = str(exc) or "Проверьте корректность введенных значений."

    return render_template("index.html", form_data=form_data, result=result, error=error)


if __name__ == "__main__":
    app.run(debug=True)
