import React, { useMemo, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import axiosInstance from "../../API/axiosInstance";
import { smartToast } from "../../API/toastManager";
import "./ContactForm.css";

function normalizeText(v) {
  if (v == null) return "";
  return String(v).trim();
}

export default function ContactForm({
  mode = "profile", // "profile" | "landing"
  initialFullName = "",
  initialEmail = "",
  title = null,
  subtitle = null,
  onSuccess,
  className = "",
}) {
  const initial = useMemo(
    () => ({
      fullName: normalizeText(initialFullName),
      email: normalizeText(initialEmail),
      message: "",
    }),
    [initialFullName, initialEmail]
  );

  const [formData, setFormData] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: normalizeText(initialFullName),
      email: normalizeText(initialEmail),
    }));
  }, [initialFullName, initialEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    const email = normalizeText(formData.email);
    const fullName = normalizeText(formData.fullName);
    const message = normalizeText(formData.message);

    if (email && !email.includes("@")) {
      smartToast.error("Please enter a valid email address");
      return;
    }
    if (!message) {
      smartToast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = { name: fullName, email, message };
      const response = await axiosInstance.post("/contact", requestData);
      const successMessage =
        response?.data?.message || "Message sent successfully! We will get back to you soon.";
      smartToast.success(successMessage);
      setFormData((prev) => ({ ...prev, message: "" }));
      onSuccess?.(response?.data);
    } catch (error) {
      let errorMessage = "Failed to send message. Please try again later.";
      const data = error?.response?.data;
      if (data) {
        if (data.message) errorMessage = data.message;
        else if (data.error) errorMessage = data.error;
        else if (typeof data === "string") errorMessage = data;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      smartToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === "landing") {
    return (
      <div className={`meetza-contact-form ${className}`.trim()}>
        {title ? <h3 className="meetza-contact-form__title">{title}</h3> : null}
        {subtitle ? <p className="meetza-contact-form__subtitle">{subtitle}</p> : null}
        <div className="contact-form-container">
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="contact-fullName">Full Name</label>
              <input
                type="text"
                id="contact-fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact-email">Email</label>
              <input
                type="email"
                id="contact-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="5"
                required
              />
            </div>
            <div className="form-submit-wrapper">
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`meetza-contact-form ${className}`.trim()}>
      {title ? <h2 className="h6 fw-bold text-dark mb-2">{title}</h2> : null}
      {subtitle ? <p className="text-muted small mb-3">{subtitle}</p> : null}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="profile-contact-fullName">
          <Form.Label>Full name</Form.Label>
          <Form.Control
            size="sm"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Your name"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="profile-contact-email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            size="sm"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="profile-contact-message">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="How can we help?"
            required
          />
        </Form.Group>
        <div className="d-flex justify-content-end rounded-pill">
          <Button type="submit" size="sm" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send"}
          </Button>
        </div>
      </Form>
    </div>
  );
}

