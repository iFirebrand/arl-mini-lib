import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddLibraryForm } from "~~/components/forms/AddLibraryForm";

const upload = vi.hoisted(() => vi.fn());
vi.mock("~~/media/handleImageUpload", () => ({ handleImageUpload: upload }));

const IMAGE_URL = "http://supabase.test/storage/v1/object/public/library-images/uploads/abc-lib.jpg";

const renderForm = (props: Partial<React.ComponentProps<typeof AddLibraryForm>> = {}) => {
  const onSubmit = vi.fn((e: React.FormEvent<HTMLFormElement>) => e.preventDefault());
  const utils = render(
    <AddLibraryForm
      isGeolocationAvailable
      latitude="38.8812"
      longitude="-77.1043"
      libraryExists={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  const form = utils.container.querySelector("form") as HTMLFormElement;
  const fileInput = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...utils, form, fileInput, onSubmit };
};

describe("AddLibraryForm", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue(IMAGE_URL);
  });

  it("puts the coordinates in hidden fields", () => {
    const { form } = renderForm();
    const data = new FormData(form);
    expect(data.get("latitude")).toBe("38.8812");
    expect(data.get("longitude")).toBe("-77.1043");
  });

  it("disables submit and asks for geolocation when it is unavailable", () => {
    const { form } = renderForm({ isGeolocationAvailable: false });
    expect(screen.getByRole("button", { name: "Add Library" })).toBeDisabled();
    expect(screen.getByText("Enable geolocation please.")).toBeInTheDocument();
    expect(new FormData(form).get("latitude")).toBe("");
  });

  it("disables submit when a library already exists here", () => {
    renderForm({ libraryExists: true });
    expect(screen.getByRole("button", { name: "Add Library" })).toBeDisabled();
  });

  it("does not submit until a photo has been uploaded", () => {
    const { form, onSubmit } = renderForm();

    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uploads the photo, then submits the form with the image URL", async () => {
    const user = userEvent.setup();
    const { form, fileInput, onSubmit } = renderForm();

    await user.type(screen.getByPlaceholderText("Choose a lib name. Be nice."), "Maple St");
    await user.upload(fileInput, new File(["img"], "lib.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("✓ lib.jpg")).toBeInTheDocument());
    expect(upload).toHaveBeenCalledWith(expect.any(File));

    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const data = new FormData(form);
    expect(data.get("locationName")).toBe("Maple St");
    expect(data.get("imageUrl")).toBe(IMAGE_URL);
  });

  it("stays unsubmittable when the upload fails", async () => {
    upload.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { form, fileInput, onSubmit } = renderForm();

    await user.upload(fileInput, new File(["img"], "lib.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add Library" })).toBeEnabled());
    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    expect(screen.queryByText("✓ lib.jpg")).not.toBeInTheDocument();
  });

  it("clears the failure message after a successful retry", async () => {
    upload.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const { fileInput } = renderForm();

    await user.upload(fileInput, new File(["img"], "bad.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText(/Upload failed/)).toBeInTheDocument());

    await user.upload(fileInput, new File(["img"], "good.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("✓ good.jpg")).toBeInTheDocument());
    expect(screen.queryByText(/Upload failed/)).not.toBeInTheDocument();
  });
});
