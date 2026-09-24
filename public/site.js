const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });
}

document.querySelectorAll(".nav-drop").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    const group = button.closest(".nav-group");

    if (!group) return;

    const isOpen = group.classList.toggle("open");

    button.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-group")) {
    document
      .querySelectorAll(".nav-group.open")
      .forEach((group) => {
        group.classList.remove("open");

        const button = group.querySelector(".nav-drop");

        if (button) {
          button.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      });
  }
});
