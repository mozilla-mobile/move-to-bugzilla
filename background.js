let user = null;

async function ensureUser() {
  if (user) {
    return user;
  }

  const { github_key, bugzilla_key } = await browser.storage.local.get();

  if (!github_key || !bugzilla_key) {
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

  const result = await response.json();

  if (!(await response).ok) {
    throw new Error(result);
  }

  return result;
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
    // TODO: could we get this from github?
    type: '--',
    version: "unspecified",
    op_sys: "android",
    summary: githubData.title,
    description: `From github: ${githubData.html_url}.\n\n`
      + `> ${githubData.body}`,
  };

  // Create bug in Bugzilla first
  const bugzillaResponse = await fetch('https://bugzilla.mozilla.org/rest/bug', {
    method: 'POST',
    body: JSON.stringify(bugzillaRequest),
  });
  const bugzillaId = (await bugzillaResponse.json()).id;

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
        + `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugzillaId}`,
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
