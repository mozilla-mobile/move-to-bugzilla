function issueInfo() {
  // Expected pathname is like
  // /{owner}/{repo}/issues/{issueId}
  const pieces = location.pathname.split('/');
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

  const products = ["--", "Fenix", "Core", "GeckoView", "WebExtensions"];
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

function init() {
  const closeButton = document.querySelector(`[name=comment_and_close]`);
  issue = issueInfo();

  if (!closeButton || !issue) {
    // probably no write privileges or not an issue page
    return;
  }

  const container = document.createElement('div');
  container.classList.add('bg-gray-light');

  const button = document.createElement('button');
  button.classList.add('btn');
  button.classList.add('js-comment-and-button');
  button.innerText = 'Move to Bugzilla';
  button.type = 'button';
  button.addEventListener('click', moveToBugzilla);
  container.appendChild(button);

  createDropdown(container, button);

  const closeButtonWrapper = closeButton.closest('div');
  // Adds correct spacing
  closeButtonWrapper.classList.add('ml-1');
  closeButtonWrapper.parentNode.insertBefore(container, closeButtonWrapper);
}

async function moveToBugzilla(event) {
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
  event.target.disabled = true;
}

init();
