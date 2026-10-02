import test from "node:test";
import assert from "node:assert/strict";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "txt", "md", "csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateResourceFile(file) {
  if (!file) return { valid: false, error: "No file selected." };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds the 10 MB limit." };
  }

  const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime = file.type ? ALLOWED_MIME_TYPES.includes(file.type) : false;

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      error: "Unsupported file type. Allowed formats: PDF, Word (.doc, .docx), PNG, JPG, WEBP, TXT, MD, CSV (max 10 MB).",
    };
  }

  return { valid: true };
}

test("validateResourceFile accepts valid .docx files even if mime type is empty", () => {
  const file = { name: "Lecture_Notes.docx", size: 1024 * 1024, type: "" };
  const res = validateResourceFile(file);
  assert.equal(res.valid, true);
});

test("validateResourceFile accepts valid .doc files with standard msword mime type", () => {
  const file = { name: "Assignment.doc", size: 500 * 1024, type: "application/msword" };
  const res = validateResourceFile(file);
  assert.equal(res.valid, true);
});

test("validateResourceFile accepts case-insensitive file extensions like .DOCX and .DOC", () => {
  const file1 = { name: "SYLLABUS.DOCX", size: 2 * 1024 * 1024, type: "" };
  const file2 = { name: "ESSAY.DOC", size: 100 * 1024, type: "" };
  assert.equal(validateResourceFile(file1).valid, true);
  assert.equal(validateResourceFile(file2).valid, true);
});

test("validateResourceFile rejects oversized files exceeding 10MB limit", () => {
  const file = { name: "LargeBook.docx", size: 11 * 1024 * 1024, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const res = validateResourceFile(file);
  assert.equal(res.valid, false);
  assert.match(res.error, /exceeds the 10 MB limit/);
});

test("validateResourceFile rejects unsupported file formats like .exe or .zip", () => {
  const file = { name: "archive.zip", size: 1024, type: "application/zip" };
  const res = validateResourceFile(file);
  assert.equal(res.valid, false);
  assert.match(res.error, /Unsupported file type/);
});
