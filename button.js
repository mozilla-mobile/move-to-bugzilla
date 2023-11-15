function issueInfo(pathname) {
  // Expected pathname is like
  // /{owner}/{repo}/issues/{issueId}
  const pieces = pathname.split('/');
  console.log(pieces);
  if (pieces[3] != "issues") {
    // Not an issue page
    return null;
  }

  const owner = pieces[1];
  const repo = pieces[2];
  const issueId = pieces[4];

  if (!owner || !repo || !issueId) {
    return null;
  }

  return {
    owner, repo, issueId
  };
}

let issue = null;
let containerDropdown;
let productDropdown;
let severityDropdown;
let priorityDropdown;
let typeDropdown;
let opSysDropdown;

let allDropdowns; // Will be an array of all dropdowns in the order they should be shown.

function createDropdown(container, button) {
  productDropdown = document.createElement('select');
  productDropdown.style.marginRight = '10px';

  componentDropdown = document.createElement('select');
  componentDropdown.style.marginRight = '10px';
  componentDropdown.disabled = true;

  const defaultOption = document.createElement('option');
  defaultOption.innerText = '--';
  defaultOption.value = '';
  componentDropdown.appendChild(defaultOption);

  const products = ["--", "Application Services", "Fenix", "Focus", "Core", "GeckoView", "WebExtensions"];
  for (product of products) {
    const option = document.createElement('option');
    option.innerText = product;
    option.value = product != "--" ? product : "";
    productDropdown.appendChild(option);
  }

  productDropdown.addEventListener('change', async () => {
    componentDropdown.innerText = "";
    componentDropdown.disabled = true;
    componentDropdown.appendChild(defaultOption);

    const components = await browser.runtime.sendMessage({
      type: "get-components",
      product: productDropdown.value
    });

    for (component of components) {
      const option = document.createElement('option');
      option.innerText = component;
      option.value = component;
      componentDropdown.appendChild(option);
    }

    componentDropdown.disabled = false;
  });

  opSysDropdown = document.createElement('select');
  for (op_sys of ["", "Android", "iOS"]) {
    const option = document.createElement('option');
    option.innerText = op_sys || "--"
    option.value = op_sys;
    opSysDropdown.appendChild(option);
  }

  severityDropdown = document.createElement('select');
  for (severity of ["S3", "S1", "S2", "S4", "S5"]) {
    const option = document.createElement('option');
    option.innerText = option.value = severity;
    severityDropdown.appendChild(option);
  }

  priorityDropdown = document.createElement('select');
  for (severity of ["P3", "P1", "P2", "P4", "P5"]) {
    const option = document.createElement('option');
    option.innerText = option.value = severity;
    priorityDropdown.appendChild(option);
  }

  typeDropdown = document.createElement('select');
  for (t of ["(use github labels)", "defect", "enhancement"]) {
    const option = document.createElement('option');
    option.innerText = t;
    if (t.charAt(0) != "(") {
      option.value = t;
    }
    typeDropdown.appendChild(option);
  }

  const enableButton = () => {
    if (productDropdown.value && componentDropdown.value) {
      button.disabled = false;
    } else {
      button.disabled = true;
    }
  };

  productDropdown.addEventListener('change', enableButton);
  componentDropdown.addEventListener('change', enableButton);

  allDropdowns = [productDropdown, componentDropdown, severityDropdown, priorityDropdown, typeDropdown, opSysDropdown];
  for (dropdown of allDropdowns) {
    dropdown.style.display = 'none';
    container.appendChild(dropdown);
  }
}

async function addButton(wrapper, pathname, expand = false) {
  issue = issueInfo(pathname);
  if (!issue) {
    // Not an issue page
    return;
  }

  const container = document.createElement('div');
  container.classList.add('bg-gray-light');

  const button = document.createElement('button');
  button.classList.add('btn');
  button.classList.add('js-comment-and-button');
  button.classList.add('browser-style');
  button.innerText = 'Move to Bugzilla';
  button.type = 'button';

  createDropdown(container, button);

  if (expand) {
    await moveToBugzilla(button);
  }

  button.addEventListener('click', ev => moveToBugzilla(ev.target));
  container.appendChild(button);

  // Adds correct spacing
  wrapper.style.marginLeft = 'auto';
  wrapper.parentNode.insertBefore(container, wrapper);
}

async function moveToBugzilla(target) {
  const component = componentDropdown.value;
  const product = productDropdown.value;

  if (!component || !product) {
    for (dropdown of allDropdowns) {
      dropdown.style.display = 'initial';
    }
  } else {
      const severity = severityDropdown.value;
      const priority = priorityDropdown.value;
      const opSys = opSysDropdown.value || "unspecified";
      const bugType = typeDropdown.value || undefined;

      browser.runtime.sendMessage({
      type: "move-to-bugzilla",
      github: issue,
      component,
      product,
      opSys,
      severity,
      priority,
      bugType,
    });
  }
  target.disabled = true;
}
