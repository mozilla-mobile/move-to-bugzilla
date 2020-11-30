async function init() {
  const wrapper = document.querySelector('#dummy');
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tabs[0].url);
  addButton(wrapper, url.pathname, /* expand */ true);
}

init();
