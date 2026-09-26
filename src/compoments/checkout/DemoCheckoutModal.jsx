import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import { validateDemoCheckout } from "../../utils/demoCheckoutValidation";
import { generateDemoOrderId } from "../../utils/generateDemoOrderId";
import "./DemoCheckoutModal.css";

const PAYMENT_METHODS = [
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "cod", label: "Cash on Delivery (Demo)" },
];

const PROCESSING_DELAY_MS = 1500;

function DemoCheckoutModal({
  isOpen,
  onClose,
  lineItems,
  totalAmount,
  onPaymentSuccess,
}) {
  const titleId = useId();
  const dialogId = useId();
  const dialogRef = useRef(null);

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [fields, setFields] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    upiId: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [phase, setPhase] = useState("form");
  const [orderId, setOrderId] = useState("");
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  const resetForm = useCallback(() => {
    setPaymentMethod("card");
    setFields({
      cardholderName: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
      upiId: "",
    });
    setFieldErrors({});
    setFormError("");
    setPhase("form");
    setOrderId("");
  }, []);

  const handleClose = useCallback(() => {
    if (phase === "processing") {
      return;
    }
    if (phase !== "success") {
      resetForm();
    }
    onClose();
  }, [onClose, phase, resetForm]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && phase === "form" && dialogRef.current) {
      dialogRef.current.querySelector(".demo-checkout__close")?.focus();
    }
  }, [isOpen, phase]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setOrderSnapshot(null);
      return;
    }
    setOrderSnapshot((current) => current ?? { lineItems, totalAmount });
  }, [isOpen, lineItems, totalAmount, resetForm]);

  const displayItems = orderSnapshot?.lineItems ?? lineItems;
  const displayTotal = orderSnapshot?.totalAmount ?? totalAmount;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError("");
  };

  const handlePay = async (event) => {
    event.preventDefault();
    if (phase !== "form") return;

    setFormError("");
    setPhase("validating");
    const { isValid, errors } = validateDemoCheckout(paymentMethod, fields);

    if (!isValid) {
      setFieldErrors(errors);
      setPhase("form");
      return;
    }

    setPhase("processing");
    await new Promise((resolve) => {
      window.setTimeout(resolve, PROCESSING_DELAY_MS);
    });

    const demoOrderId = generateDemoOrderId();
    setOrderId(demoOrderId);
    setPhase("success");
    onPaymentSuccess();
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const itemCount = displayItems.reduce((sum, item) => sum + item.qty, 0);

  return createPortal(
    <div className="demo-checkout-layer">
      <button
        type="button"
        className="demo-checkout__backdrop"
        aria-label="Close checkout"
        onClick={handleClose}
        disabled={phase === "processing"}
      />
      <div
        id={dialogId}
        ref={dialogRef}
        className="demo-checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="demo-checkout__header">
          <h2 id={titleId} className="demo-checkout__title">
            {phase === "success" ? "Order complete" : "Checkout"}
          </h2>
          {phase !== "success" && phase !== "processing" ? (
            <button
              type="button"
              className="demo-checkout__close"
              aria-label="Close checkout"
              onClick={handleClose}
            >
              <AiOutlineClose aria-hidden="true" />
            </button>
          ) : null}
        </header>

        <div className="demo-checkout__body">
          {phase === "success" ? (
            <div className="demo-checkout-success" role="status">
              <div className="demo-checkout-success__icon" aria-hidden="true">
                <AiOutlineCheck />
              </div>
              <h3 className="demo-checkout-success__title">Payment successful</h3>
              <p className="demo-checkout-success__text">
                Simulated demo order placed successfully. No real payment was processed.
              </p>
              <dl className="demo-checkout-success__details">
                <div>
                  <dt>Order</dt>
                  <dd>{orderId}</dd>
                </div>
                <div>
                  <dt>Total paid (demo)</dt>
                  <dd>${displayTotal}</dd>
                </div>
              </dl>
              <Link
                to="/"
                className="btn-action btn-action--primary demo-checkout-success__cta"
                onClick={handleClose}
              >
                Continue shopping
              </Link>
            </div>
          ) : phase === "processing" ? (
            <div className="demo-checkout-processing" role="status" aria-live="polite">
              <div className="demo-checkout-processing__spinner" aria-hidden="true" />
              <p className="demo-checkout-processing__title">Processing payment…</p>
              <p className="demo-checkout-processing__text">Please wait. This is a simulated demo checkout.</p>
            </div>
          ) : (
            <form className="demo-checkout-form" onSubmit={handlePay} noValidate>
              <section className="demo-checkout-section" aria-labelledby="checkout-order-summary">
                <h3 id="checkout-order-summary" className="demo-checkout-section__title">
                  Order summary
                </h3>
                <ul className="demo-checkout-lines">
                  {displayItems.map((item) => (
                    <li key={item.id} className="demo-checkout-line">
                      <div className="demo-checkout-line__info">
                        <span className="demo-checkout-line__name">{item.name}</span>
                        <span className="demo-checkout-line__meta">Quantity: {item.qty}</span>
                      </div>
                      <span className="demo-checkout-line__price">${item.price * item.qty}</span>
                    </li>
                  ))}
                </ul>
                <div className="demo-checkout-total-row">
                  <span>Total ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
                  <strong>${displayTotal}</strong>
                </div>
              </section>

              <section className="demo-checkout-section" aria-labelledby="checkout-payment-method">
                <h3 id="checkout-payment-method" className="demo-checkout-section__title">
                  Payment method
                </h3>
                <p className="demo-checkout-demo-note">Simulated demo checkout — no real charge.</p>
                <div className="demo-checkout-methods" role="radiogroup" aria-label="Payment method">
                  {PAYMENT_METHODS.map((method) => (
                    <Form.Check
                      key={method.id}
                      type="radio"
                      id={`payment-${method.id}`}
                      name="paymentMethod"
                      label={method.label}
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => {
                        setPaymentMethod(method.id);
                        setFieldErrors({});
                        setFormError("");
                      }}
                    />
                  ))}
                </div>
              </section>

              {paymentMethod === "card" ? (
                <section className="demo-checkout-section" aria-labelledby="checkout-card-details">
                  <h3 id="checkout-card-details" className="demo-checkout-section__title">
                    Card details (demo)
                  </h3>
                  <Form.Group className="demo-checkout-field" controlId="demo-cardholder">
                    <Form.Label>Cardholder name</Form.Label>
                    <Form.Control
                      name="cardholderName"
                      value={fields.cardholderName}
                      onChange={handleFieldChange}
                      autoComplete="off"
                      isInvalid={Boolean(fieldErrors.cardholderName)}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.cardholderName}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="demo-checkout-field" controlId="demo-card-number">
                    <Form.Label>Card number</Form.Label>
                    <Form.Control
                      name="cardNumber"
                      value={fields.cardNumber}
                      onChange={handleFieldChange}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="4111 1111 1111 1111"
                      isInvalid={Boolean(fieldErrors.cardNumber)}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.cardNumber}</Form.Control.Feedback>
                  </Form.Group>
                  <div className="demo-checkout-field-row">
                    <Form.Group className="demo-checkout-field" controlId="demo-expiry">
                      <Form.Label>Expiry</Form.Label>
                      <Form.Control
                        name="expiry"
                        value={fields.expiry}
                        onChange={handleFieldChange}
                        placeholder="MM/YY"
                        autoComplete="off"
                        isInvalid={Boolean(fieldErrors.expiry)}
                      />
                      <Form.Control.Feedback type="invalid">{fieldErrors.expiry}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="demo-checkout-field" controlId="demo-cvv">
                      <Form.Label>CVV</Form.Label>
                      <Form.Control
                        name="cvv"
                        value={fields.cvv}
                        onChange={handleFieldChange}
                        inputMode="numeric"
                        autoComplete="off"
                        isInvalid={Boolean(fieldErrors.cvv)}
                      />
                      <Form.Control.Feedback type="invalid">{fieldErrors.cvv}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                </section>
              ) : null}

              {paymentMethod === "upi" ? (
                <section className="demo-checkout-section" aria-labelledby="checkout-upi-details">
                  <h3 id="checkout-upi-details" className="demo-checkout-section__title">
                    UPI (demo)
                  </h3>
                  <Form.Group className="demo-checkout-field" controlId="demo-upi">
                    <Form.Label>UPI ID</Form.Label>
                    <Form.Control
                      name="upiId"
                      value={fields.upiId}
                      onChange={handleFieldChange}
                      placeholder="name@bank"
                      autoComplete="off"
                      isInvalid={Boolean(fieldErrors.upiId)}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.upiId}</Form.Control.Feedback>
                  </Form.Group>
                </section>
              ) : null}

              {paymentMethod === "cod" ? (
                <p className="demo-checkout-cod-note">
                  Pay on delivery in this demo flow. No payment details are required.
                </p>
              ) : null}

              {formError ? (
                <p className="demo-checkout-form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="demo-checkout-actions">
                <Button type="button" variant="outline-secondary" onClick={handleClose}>
                  Back to cart
                </Button>
                <Button type="submit" className="demo-checkout-pay-btn" variant="primary">
                  {paymentMethod === "cod" ? `Place demo order · $${displayTotal}` : `Pay $${displayTotal} (demo)`}
                </Button>
              </div>
              <p className="demo-checkout-disclaimer">
                Demo checkout — no real payment will be processed.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DemoCheckoutModal;
