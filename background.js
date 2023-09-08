let user = null;

async function ensureUser() {
  if (user) {
    return user;
  }

  const { github_key, bugzilla_key } = await browser.storage.local.get();

  if (!github_key || !bugzilla_key) {
    browser.runtime.openOptionsPage();
    throw new Error("Missing keys.");
  }

  user = {
    bugzilla_key,
    github_key,
  };

  return user;
}

browser.runtime.onMessage.addListener((data, sender) => {
  switch (data.type) {
    case "move-to-bugzilla": {
      moveToBugzilla(data);
      break;
    }

    case "get-components": {
      return getComponents(data);
      break;
    }
  }
});

async function getComponents(data) {
  const { product } = data;
  const result = await fetch(
      `https://bugzilla.mozilla.org/rest/product?names=${product}`);
  const productData = await result.json();
  return productData.products[0].components.map(c => c.name);
}

async function githubIssueApi({ issue, path = '', data, method = 'GET' }) {
  const body = {
    ... issue,
    ... data,
  };

  const user = await ensureUser();

  const request = {
    method,
    headers: {'Authorization': `token ${user.github_key}`},
  };

  if (method === 'POST') {
    request.body = JSON.stringify(body);
  }

  const response = await fetch(
    `https://api.github.com/repos/${issue.owner}/${issue.repo}`
    + `/issues/${issue.issue_number}${path}`,
    request
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = await response.json();

  return result;
}

function bugzillaDescription(githubData) {
  // Add ">" to each line.
  const quote = (githubData.body || "")
    .split('\n')
    .map(s => '> ' + s)
    .join('\n');
  return `From github: ${githubData.html_url}.\n\n`
    + `${quote}\n\n`
    + `Change performed by the [Move to Bugzilla add-on](`
    +    `https://addons.mozilla.org/en-US/firefox/addon/move-to-bugzilla/).`;
}

// These are IDs for GitHub labels that corresponds to a "defect"
const DEFECT_TYPE_LABEL_IDS = new Set([
  875862810
]);

// These are IDs for GitHub labels that corresponds to a "enhancement"
const ENHANCEMENT_TYPE_LABEL_IDS = new Set([
  877027717
]);

function bugzillaType(githubData) {
  if (!("labels" in githubData)) {
    return "defect";
  }
  for (label of githubData.labels) {
    if (DEFECT_TYPE_LABEL_IDS.has(label.id)) {
      return "defect";
    }
    if (ENHANCEMENT_TYPE_LABEL_IDS.has(label.id)) {
      return "enhancement";
    }
  }
  return "defect";
}

async function moveToBugzilla(data) {
  const { github, component, product } = data;

  const user = await ensureUser();

  const issue = {
    owner: github.owner,
    repo: github.repo,
    issue_number: github.issueId,
  };

  const githubData = await githubIssueApi({
    issue
  });

  const bugzillaRequest = {
    api_key: user.bugzilla_key,
    product,
    component,
    type: bugzillaType(githubData),
    version: "unspecified",
    op_sys: "android",
    summary: githubData.title,
    description: bugzillaDescription(githubData),
  };

  // Create bug in Bugzilla first
  const bugzillaResponse = await fetch('https://bugzilla.mozilla.org/rest/bug', {
    method: 'POST',
    body: JSON.stringify(bugzillaRequest),
  });

  const response = await bugzillaResponse.json();
  const bugzillaId = response.id;

  if (!bugzillaId) {
    throw new Error("Could not create bugzilla bug.");
  }

  // Add comment
  await githubIssueApi({
    issue,
    method: 'POST',
    path: '/comments',
    data: {
      body: `Moved to bugzilla: `
        + `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugzillaId}\n\n`
        + `Change performed by the [Move to Bugzilla add-on](`
        +     `https://addons.mozilla.org/en-US/firefox/addon/move-to-bugzilla/).`,
    }
  });

  // Close issue
  await githubIssueApi({
    issue,
    method: 'POST',
    data: {
      state: "closed",
    },
  });
}
