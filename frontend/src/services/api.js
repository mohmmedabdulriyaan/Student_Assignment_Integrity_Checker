const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://student-assignment-integrity-checker-api.onrender.com"
).replace(/\/+$/, "");

export async function createSubmission(formData) {
  const response = await fetch(
    `${API_BASE_URL}/api/submissions`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let errorMessage =
      "Failed to create submission.";

    try {
      const errorData =
        await response.json();

      errorMessage =
        errorData.detail ||
        errorMessage;
    } catch {
      // Keep default message.
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getSubmissions() {
  const response = await fetch(
    `${API_BASE_URL}/api/submissions`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load submissions."
    );
  }

  return response.json();
}

export async function verifySubmission(
  submissionId,
  file
) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_BASE_URL}/api/verify/${submissionId}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let errorMessage =
      "Failed to verify assignment.";

    try {
      const errorData =
        await response.json();

      errorMessage =
        errorData.detail ||
        errorMessage;
    } catch {
      // Keep default message.
    }

    throw new Error(
      errorMessage
    );
  }

  return response.json();
}

export async function getVerifications() {
  const response = await fetch(
    `${API_BASE_URL}/api/verifications`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load verification history."
    );
  }

  return response.json();
}

// --------------------------------------------------
// FILE PREVIEW URL
// --------------------------------------------------

export function getSubmissionFileUrl(
  submissionId
) {
  return `${API_BASE_URL}/api/submissions/${submissionId}/file`;
}

// --------------------------------------------------
// FILE DOWNLOAD URL
// --------------------------------------------------

export function getSubmissionDownloadUrl(
  submissionId
) {
  return `${API_BASE_URL}/api/submissions/${submissionId}/file?download=true`;
}