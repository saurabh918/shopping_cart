import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShoppingAssistant from "./ShoppingAssistant";
import * as assistantApi from "../../services/assistantApi";

jest.mock("../../services/assistantApi", () => ({
  ...jest.requireActual("../../services/assistantApi"),
  askAssistant: jest.fn(),
}));

describe("ShoppingAssistant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the assistant section", () => {
    render(<ShoppingAssistant />);
    expect(screen.getByRole("heading", { name: /shopping assistant/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your question/i)).toBeInTheDocument();
  });

  it("disables submit when question is empty", () => {
    render(<ShoppingAssistant />);
    expect(screen.getByRole("button", { name: /^ask$/i })).toBeDisabled();
  });

  it("shows validation for whitespace-only question", async () => {
    render(<ShoppingAssistant />);
    const form = screen.getByRole("textbox", { name: /your question/i }).closest("form");
    fireEvent.change(screen.getByLabelText(/your question/i), { target: { value: "   " } });
    fireEvent.submit(form);
    expect(await screen.findByText(/please enter a question/i)).toBeInTheDocument();
    expect(assistantApi.askAssistant).not.toHaveBeenCalled();
  });

  it("submits a valid question and shows answer and matches", async () => {
    assistantApi.askAssistant.mockResolvedValue({
      success: true,
      answer: "The iPhone 6S costs $799.",
      answerSource: "llm",
      matches: [{ product: { id: 0, name: "iPhone 6S", price: 799, inStock: 3, blurb: "Test blurb." } }],
    });

    render(<ShoppingAssistant />);
    fireEvent.change(screen.getByLabelText(/your question/i), {
      target: { value: "What is the price of iPhone 6S?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(assistantApi.askAssistant).toHaveBeenCalledWith("What is the price of iPhone 6S?");
    await waitFor(() => {
      expect(screen.getByText("The iPhone 6S costs $799.")).toBeInTheDocument();
    });
    expect(screen.getByText(/ai response/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "iPhone 6S" })).toBeInTheDocument();
  });

  it("shows catalog fallback label", async () => {
    assistantApi.askAssistant.mockResolvedValue({
      success: true,
      answer: "No matching product.",
      answerSource: "retrieval-fallback",
      matches: [],
    });

    render(<ShoppingAssistant />);
    fireEvent.change(screen.getByLabelText(/your question/i), {
      target: { value: "camera quality" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^ask$/i }));

    await waitFor(() => {
      expect(screen.getByText(/catalog fallback/i)).toBeInTheDocument();
    });
  });

  it("handles API errors", async () => {
    assistantApi.askAssistant.mockRejectedValue(new Error("Network failed"));

    render(<ShoppingAssistant />);
    fireEvent.change(screen.getByLabelText(/your question/i), {
      target: { value: "Which products are in stock?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^ask$/i }));

    await waitFor(() => {
      expect(screen.getByText(/network failed/i)).toBeInTheDocument();
    });
  });
});
