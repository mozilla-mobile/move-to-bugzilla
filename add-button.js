function init() {
  const closeButton = document.querySelector(`[name=comment_and_close]`);

  if (!closeButton) {
    // probably no write privileges or not an issue page
    return;
  }

  const closeButtonWrapper = closeButton.closest('div');
  addButton(closeButtonWrapper, location.pathname);
}

init();
