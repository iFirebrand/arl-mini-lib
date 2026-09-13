import { beforeEach, describe, expect, it, vi } from "vitest";

const lib = vi.hoisted(() => ({ getModeratorId: vi.fn(), setHidden: vi.fn() }));
vi.mock("~~/lib/moderation", () => lib);

const { setBookHidden, setLibraryHidden } = await import("~~/actions/moderation");

describe("moderation actions", () => {
  beforeEach(() => {
    lib.getModeratorId.mockReset().mockResolvedValue("acc_mod");
    lib.setHidden.mockReset().mockResolvedValue(true);
  });

  it("hide and unhide libraries and books for a moderator", async () => {
    expect(await setLibraryHidden("lib_1", true)).toEqual({ ok: true });
    expect(await setBookHidden("item_1", false)).toEqual({ ok: true });
    expect(lib.setHidden).toHaveBeenNthCalledWith(1, "acc_mod", "library", "lib_1", true);
    expect(lib.setHidden).toHaveBeenNthCalledWith(2, "acc_mod", "item", "item_1", false);
  });

  it("refuse anyone who isn't a moderator", async () => {
    lib.getModeratorId.mockResolvedValue(null);
    expect(await setLibraryHidden("lib_1", true)).toEqual({ ok: false, error: "Only moderators can do this" });
    expect(lib.setHidden).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty id", "", true],
    ["a very long id", "x".repeat(65), true],
    ["a non-string id", 42, true],
    ["a non-boolean flag", "lib_1", "yes"],
  ])("reject %s before checking the session", async (_label, id, hidden) => {
    expect(await setLibraryHidden(id as string, hidden as boolean)).toEqual({ ok: false, error: "Invalid request" });
    expect(lib.getModeratorId).not.toHaveBeenCalled();
  });

  it("say when the library or book doesn't exist", async () => {
    lib.setHidden.mockResolvedValue(false);
    expect(await setLibraryHidden("lib_x", true)).toEqual({ ok: false, error: "Library not found" });
    expect(await setBookHidden("item_x", true)).toEqual({ ok: false, error: "Book not found" });
  });
});
