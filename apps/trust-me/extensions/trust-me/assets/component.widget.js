if (!customElements.get("ui-widget")) {
  class Widget extends HTMLElement {
    static instances = [];
    static currentIndex = 0;
    static interval = null;

    connectedCallback() {
      Widget.instances.push(this);

      if (!this.hasAttribute("popover")) this.setAttribute("popover", "manual");

      this.querySelectorAll('[ui-widget="close"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          this.hidePopover();
          Widget.currentIndex =
            (Widget.instances.indexOf(this) + 1) % Widget.instances.length;
        });
      });

      this.addEventListener("mouseenter", () => clearInterval(Widget.interval));
      this.addEventListener("mouseleave", () => Widget.autoPlay());

      Promise.resolve().then(() => {
        if (Widget.instances.at(-1) === this) {
          setTimeout(() => Widget.autoPlay(), 1000);
        }
      });
    }

    disconnectedCallback() {
      Widget.instances = Widget.instances.filter((el) => el !== this);
      if (Widget.instances.length === 0) clearInterval(Widget.interval);
    }

    static showItem(index) {
      Widget.instances.forEach((item, i) => {
        if (i === index) {
          if (!item.matches(":popover-open")) item.showPopover();
        } else {
          if (item.matches(":popover-open")) item.hidePopover();
        }
      });
    }

    static autoPlay() {
      clearInterval(Widget.interval);

      Widget.interval = setInterval(() => {
        Widget.showItem(Widget.currentIndex);
        Widget.currentIndex =
          (Widget.currentIndex + 1) % Widget.instances.length;
      }, 6000);
    }
  }

  customElements.define("ui-widget", Widget);
}
