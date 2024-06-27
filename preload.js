window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) {
      element.innerText = text;
    } else {
      console.error(`Element with id '${selector}' not found`);
    }
  };

  ['chrome', 'node', 'electron'].forEach(dependency => {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  });
});
