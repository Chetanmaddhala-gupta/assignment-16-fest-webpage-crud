const schemas = {
  events: { noun: "event", fields: [{ key: "name", label: "Event name", required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "venue", label: "Venue", required: true }], columns: ["name", "date", "venue"] }
};
const entity = document.body.dataset.entity;
const schema = schemas[entity];
const endpoint = `/${entity}`;
const status = document.createElement("p");
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
document.querySelector("#record-form").before(status);
const form = document.querySelector("#record-form");
const tableWrap = document.querySelector("#table-wrap");
const empty = document.querySelector("#empty");
const search = document.querySelector("#search");
const count = document.querySelector("#record-count");
const title = document.querySelector("#form-title");
let editingId = null;
let records = [];
let busy = false;

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const error = await response.json();
      detail = typeof error.detail === "string" ? error.detail
        : (error.detail || []).map(item => item.msg).join("; ") || detail;
    } catch { /* Keep the HTTP status when the server returns no JSON. */ }
    throw new Error(detail);
  }
  return response.status === 204 ? null : response.json();
}
async function loadRecords() {
  records = await request(endpoint);
  render();
}
function showError(error) {
  status.textContent = error.message || "Cannot reach the API. Start the FastAPI server and reload.";
}
function setBusy(value) {
  busy = value;
  for (const control of form.elements) control.disabled = value;
  search.disabled = value;
  for (const button of tableWrap.querySelectorAll("button")) button.disabled = value;
}
function fieldId(key) { return `field-${key}`; }

schema.fields.forEach((field) => {
  const label = document.createElement("label");
  label.htmlFor = fieldId(field.key);
  label.textContent = field.label;
  const input = document.createElement("input");
  input.id = fieldId(field.key);
  input.name = field.key;
  input.type = field.type || "text";
  input.required = Boolean(field.required);
  input.autocomplete = field.key === "email" ? "email" : "off";
  form.append(label, input);
});
const submit = document.createElement("button");
submit.className = "primary";
submit.type = "submit";
submit.textContent = `Save ${schema.noun}`;
form.append(submit);
const cancel = document.createElement("button");
cancel.className = "secondary";
cancel.type = "button";
cancel.textContent = "Cancel edit";
cancel.hidden = true;
cancel.addEventListener("click", resetForm);
form.append(cancel);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(schema.fields.map((field) => [field.key, form.elements[field.key].value.trim()]));
  if (schema.fields.some((field) => !values[field.key])) return;
  if (busy) return;
  setBusy(true);
  try {
    await request(editingId === null ? endpoint : `${endpoint}/${editingId}`, {
      method: editingId === null ? "POST" : "PUT",
      body: JSON.stringify(values)
    });
    resetForm();
    status.textContent = "Saved successfully.";
    await loadRecords();
  } catch (error) { showError(error); }
  finally { setBusy(false); }
});

function resetForm() {
  editingId = null;
  form.reset();
  title.textContent = `Add a ${schema.noun}`;
  submit.textContent = `Save ${schema.noun}`;
  cancel.hidden = true;
}
function editRecord(id) {
  const record = records.find((item) => item.id === id);
  if (busy || !record) return;
  editingId = id;
  schema.fields.forEach((field) => { form.elements[field.key].value = record[field.key] || ""; });
  title.textContent = `Edit ${schema.noun}`;
  submit.textContent = `Update ${schema.noun}`;
  cancel.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.elements[schema.fields[0].key].focus();
}
async function deleteRecord(id) {
  if (busy) return;
  setBusy(true);
  try {
    await request(`${endpoint}/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    status.textContent = "Deleted successfully.";
    await loadRecords();
  } catch (error) { showError(error); }
  finally { setBusy(false); }
}
function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const visible = records.filter((record) => schema.fields.some((field) => String(record[field.key] || "").toLocaleLowerCase().includes(query)));
  count.textContent = records.length;
  tableWrap.replaceChildren();
  empty.hidden = visible.length > 0;
  empty.textContent = records.length === 0
    ? `No ${schema.noun}s yet. Add the first ${schema.noun} above.`
    : `No ${schema.noun}s match your search.`;
  if (!visible.length) return;
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  [...schema.columns, "Actions"].forEach((key) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = key === "Actions" ? key : schema.fields.find((field) => field.key === key).label;
    head.append(th);
  });
  const body = table.createTBody();
  visible.forEach((record) => {
    const row = body.insertRow();
    schema.columns.forEach((key) => { row.insertCell().textContent = record[key] || ""; });
    const actions = row.insertCell();
    const edit = document.createElement("button");
    edit.className = "text-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editRecord(record.id));
    const remove = document.createElement("button");
    remove.className = "text-button danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteRecord(record.id));
    actions.append(edit, remove);
  });
  tableWrap.append(table);
}
search.addEventListener("input", render);
async function initialize() {
  setBusy(true);
  status.textContent = "Loading records...";
  try { await loadRecords(); status.textContent = ""; }
  catch (error) { showError(error); }
  finally { setBusy(false); }
}
initialize();
