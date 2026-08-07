async function loadMessage() {
  const el = document.getElementById('apiMessage');
  try {
    const res = await fetch('/api/message');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    el.innerText = data && data.text ? data.text : JSON.stringify(data);
  } catch (err) {
    el.innerText = 'Error fetching API message: ' + err.message;
  }
}

window.addEventListener('DOMContentLoaded', loadMessage);
