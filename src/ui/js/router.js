(function () {
  const mainContent = document.getElementById('mainContent');
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  let currentPage = null;

  function navigate(pageId) {
    const pageModule = window.Pages && window.Pages[pageId];
    if (!pageModule) { mainContent.innerHTML = `<div class="empty-state">Unknown page: ${pageId}</div>`; return; }
    navItems.forEach((item) => { item.classList.toggle('active', item.dataset.page === pageId); });
    currentPage = pageId;
    mainContent.innerHTML = '';
    pageModule.render(mainContent);
  }

  navItems.forEach((item) => { item.addEventListener('click', () => navigate(item.dataset.page)); });
  window.AppRouter = { navigate, current: () => currentPage };
  navigate('dashboard');
})();
