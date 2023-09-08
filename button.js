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

function createDropdown(container, button) {
  productDropdown = document.createElement('select');
  productDropdown.style.marginRight = '10px';
  productDropdown.style.display = 'none';

  componentDropdown = document.createElement('select');
  componentDropdown.style.marginRight = '10px';
  componentDropdown.style.display = 'none';
  componentDropdown.disabled = true;

  const defaultOption = document.createElement('option');
  defaultOption.innerText = '--';
  defaultOption.value = '';
  componentDropdown.appendChild(defaultOption);

  const products = ["--", "Fenix", "Focus", "Core", "GeckoView", "WebExtensions", "Testing"];
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

  const enableButton = () => {
    if (productDropdown.value && componentDropdown.value) {
      button.disabled = false;
    } else {
      button.disabled = true;
    }
  };

  productDropdown.addEventListener('change', enableButton);
  componentDropdown.addEventListener('change', enableButton);

  container.appendChild(productDropdown);
  container.appendChild(componentDropdown);
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
    componentDropdown.style.display = 'initial';
    productDropdown.style.display = 'initial';
  } else {
    browser.runtime.sendMessage({
      type: "move-to-bugzilla",
      github: issue,
      component,
      product,
    });
  }
  target.disabled = true;
}
