(function () {
  "use strict";

  const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
  const els = {
    chooseFolder: document.getElementById("choose-folder"),
    downloadManifest: document.getElementById("download-manifest"),
    newEdition: document.getElementById("new-edition"),
    form: document.getElementById("issue-form"),
    date: document.getElementById("issue-date"),
    pageFiles: document.getElementById("page-files"),
    selectedFiles: document.getElementById("selected-files"),
    editingLabel: document.getElementById("editing-label"),
    issueList: document.getElementById("issue-list"),
    issueCount: document.getElementById("issue-count"),
    status: document.getElementById("status"),
  };

  let issues = [];
  let editingDate = null;
  let projectHandle = null;

  function sortIssues() {
    issues.sort((a, b) => b.date.localeCompare(a.date));
  }

  function showStatus(message, kind) {
    els.status.textContent = message;
    els.status.className = `admin-status${kind ? ` admin-status--${kind}` : ""}`;
  }

  function validDate(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  function readSelectedFiles() {
    return [...els.pageFiles.files].filter((file) => IMAGE_EXTENSIONS.test(file.name));
  }

  function renderSelectedFiles() {
    const files = readSelectedFiles();
    els.selectedFiles.textContent = files.length
      ? files.map((file, index) => `${index + 1}. ${file.name}`).join("  |  ")
      : "No replacement images selected.";
  }

  function renderIssues() {
    sortIssues();
    els.issueCount.textContent = `${issues.length} edition${issues.length === 1 ? "" : "s"}`;
    els.issueList.innerHTML = "";

    if (!issues.length) {
      els.issueList.innerHTML = '<p class="admin-empty">No editions found. Create the first one above.</p>';
      return;
    }

    issues.forEach((issue) => {
      const item = document.createElement("article");
      item.className = "issue-row";
      item.innerHTML = `
        <div>
          <strong>${issue.date}</strong>
          <span>${issue.pages.length} page${issue.pages.length === 1 ? "" : "s"}</span>
        </div>
        <button class="admin-btn admin-btn--small" type="button">Edit</button>
      `;
      item.querySelector("button").addEventListener("click", () => editIssue(issue.date));
      els.issueList.appendChild(item);
    });
  }

  function setNewEdition() {
    editingDate = null;
    els.form.reset();
    els.editingLabel.textContent = "Creating a new edition";
    renderSelectedFiles();
  }

  function editIssue(date) {
    const issue = issues.find((entry) => entry.date === date);
    if (!issue) return;
    editingDate = date;
    els.date.value = date;
    els.pageFiles.value = "";
    els.editingLabel.textContent = `Editing ${date} — existing pages stay unless replaced`;
    renderSelectedFiles();
    els.date.focus();
  }

  async function loadManifest() {
    try {
      const response = await fetch("data/issues.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      issues = Array.isArray(data.issues) ? data.issues : [];
      renderIssues();
      showStatus("Archive loaded. Choose the project folder before saving changes.");
    } catch (error) {
      showStatus("Could not load data/issues.json. Start this site with a local web server.", "error");
    }
  }

  async function chooseFolder() {
    if (!window.showDirectoryPicker) {
      showStatus("Direct folder saving needs Chrome or Edge. Use Download manifest, then copy the file and images manually.", "error");
      return;
    }

    try {
      projectHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      showStatus(`Selected ${projectHandle.name}. Changes can now be saved directly.` , "success");
    } catch (error) {
      if (error.name !== "AbortError") showStatus("The project folder could not be opened.", "error");
    }
  }

  async function getDirectory(parent, name) {
    return parent.getDirectoryHandle(name, { create: true });
  }

  async function writeFile(directory, name, contents) {
    const handle = await directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  async function saveIssue(date, files) {
    if (!projectHandle) throw new Error("Choose the project folder first.");
    const pagesDirectory = await getDirectory(projectHandle, "pages");
    const issueDirectory = await getDirectory(pagesDirectory, date);
    const existing = issues.find((issue) => issue.date === date);
    const pagePaths = existing ? [...existing.pages] : [];

    for (let index = 0; index < files.length; index += 1) {
      const extension = files[index].name.match(/\.(jpe?g|png|webp)$/i)[1].toLowerCase();
      const filename = `${index + 1}.${extension}`;
      await writeFile(issueDirectory, filename, files[index]);
      pagePaths[index] = `pages/${date}/${filename}`;
    }

    if (!pagePaths.length) throw new Error("Add at least one page image.");
    const nextIssue = { date, pageCount: pagePaths.length, pages: pagePaths };
    issues = issues.filter((issue) => issue.date !== date);
    issues.push(nextIssue);
    sortIssues();
    const dataDirectory = await getDirectory(projectHandle, "data");
    await writeFile(dataDirectory, "issues.json", `${JSON.stringify({ issues }, null, 2)}\n`);
  }

  async function submit(event) {
    event.preventDefault();
    const date = els.date.value;
    const files = readSelectedFiles();
    if (!validDate(date)) {
      showStatus("Enter a valid edition date.", "error");
      return;
    }

    try {
      await saveIssue(date, files);
      renderIssues();
      editingDate = date;
      els.editingLabel.textContent = `Saved ${date}`;
      els.pageFiles.value = "";
      renderSelectedFiles();
      showStatus(`Saved ${date}. Commit and push the changed pages and manifest to publish it.`, "success");
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  function downloadManifest() {
    const blob = new Blob([`${JSON.stringify({ issues }, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "issues.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showStatus("Manifest downloaded. Replace data/issues.json with it before pushing.", "success");
  }

  els.chooseFolder.addEventListener("click", chooseFolder);
  els.downloadManifest.addEventListener("click", downloadManifest);
  els.newEdition.addEventListener("click", setNewEdition);
  els.pageFiles.addEventListener("change", renderSelectedFiles);
  els.form.addEventListener("submit", submit);
  loadManifest();
})();
