const CARD_NUMBER_DIGITS = /^\d{13,19}$/;
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_PATTERN = /^\d{3,4}$/;
const UPI_PATTERN = /^[\w.-]{2,}@[\w.-]{2,}$/i;

export function validateDemoCheckout(paymentMethod, fields) {
  const errors = {};

  if (paymentMethod === "card") {
    const name = String(fields.cardholderName || "").trim();
    const number = String(fields.cardNumber || "").replace(/\s+/g, "");
    const expiry = String(fields.expiry || "").trim();
    const cvv = String(fields.cvv || "").trim();

    if (name.length < 2) {
      errors.cardholderName = "Enter the cardholder name.";
    }
    if (!CARD_NUMBER_DIGITS.test(number)) {
      errors.cardNumber = "Enter a valid demo card number (13–19 digits).";
    }
    if (!EXPIRY_PATTERN.test(expiry)) {
      errors.expiry = "Use MM/YY format.";
    }
    if (!CVV_PATTERN.test(cvv)) {
      errors.cvv = "Enter a 3- or 4-digit CVV.";
    }
  } else if (paymentMethod === "upi") {
    const upiId = String(fields.upiId || "").trim();
    if (!UPI_PATTERN.test(upiId)) {
      errors.upiId = "Enter a valid demo UPI ID (e.g. name@bank).";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
