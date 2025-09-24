const API_URL = "https://9cla0o7tr6.execute-api.eu-west-1.amazonaws.com/upload";

function getSessionImageKeys() {
  return JSON.parse(sessionStorage.getItem("myImageKeys") || "[]");
}

function addToSessionImageKeys(url) {
  const current = getSessionImageKeys();
  current.push(url);
  sessionStorage.setItem("myImageKeys", JSON.stringify(current));
}

function renderGallery(urls) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  urls.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    gallery.appendChild(img);
  });
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  errorText.textContent = message;
  errorDiv.style.display = "block";
}

function clearError() {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  errorText.textContent = "";
  errorDiv.style.display = "none";
}

async function uploadImage() {
  clearError();

  const fileInput = document.getElementById('imageInput');
  const file = fileInput.files[0];
  if (!file) {
    showError("Please select a file to upload.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    showError("Only image files are allowed.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    
    const res = await fetch(API_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed on server.");

    const data = await res.json();

    addToSessionImageKeys(data.originalUrl);
    addToSessionImageKeys(data.croppedUrl);

    document.getElementById("uploadedImage").src = data.originalUrl;
    document.getElementById("croppedImage").src = data.croppedUrl;

    renderGallery(data.allImages);
  } catch (err) {
    showError("Upload error: " + err.message);
  }
}

async function loadGallery() {
  clearError();
  try {
    const res = await fetch(API_URL + "?fetchOnly=true", { method: "GET" });
    if (!res.ok) throw new Error("Failed to fetch gallery.");

    const data = await res.json();
    const sessionImages = getSessionImageKeys();

    const filtered = data.allImages.filter(url => sessionImages.includes(url));
    renderGallery(filtered);
  } catch (err) {
    showError("Error loading gallery: " + err.message);
  }
}

window.addEventListener("DOMContentLoaded", loadGallery);

