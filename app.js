const schemas = {
  students: { noun: "student", fields: [{ key: "name", label: "Full name", required: true }, { key: "email", label: "Email", type: "email", required: true }, { key: "course", label: "Course", required: true }], columns: ["name", "email", "course"] },
  books: { noun: "book", fields: [{ key: "title", label: "Book title", required: true }, { key: "author", label: "Author", required: true }, { key: "genre", label: "Genre", required: true }], columns: ["title", "author", "genre"] },
  events: { noun: "event", fields: [{ key: "name", label: "Event name", required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "venue", label: "Venue", required: true }], columns: ["name", "date", "venue"] }
};
const entity = document.body.dataset.entity;
const schema = schemas[entity];
const storageKey = `assignment-crud-${entity}-v1`;
const form = document.querySelector("#record-form");
const tableWrap = document.querySelector("#table-wrap");
const empty = document.querySelector("#empty");
const search = document.querySelector("#search");
const count = document.querySelector("#record-count");
const title = document.querySelector("#form-title");
let editingId = null;
let records = loadRecords();

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function saveRecords() { localStorage.setItem(storageKey, JSON.stringify(records)); }
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(schema.fields.map((field) => [field.key, form.elements[field.key].value.trim()]));
  if (schema.fields.some((field) => !values[field.key])) return;
  if (editingId) {
    records = records.map((record) => record.id === editingId ? { ...record, ...values } : record);
  } else {
    records.unshift({ id: crypto.randomUUID(), ...values, createdAt: Date.now() });
  }
  saveRecords();
  resetForm();
  render();
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
  if (!record) return;
  editingId = id;
  schema.fields.forEach((field) => { form.elements[field.key].value = record[field.key] || ""; });
  title.textContent = `Edit ${schema.noun}`;
  submit.textContent = `Update ${schema.noun}`;
  cancel.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.elements[schema.fields[0].key].focus();
}
function deleteRecord(id) {
  records = records.filter((item) => item.id !== id);
  saveRecords();
  if (editingId === id) resetForm();
  render();
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
render();
