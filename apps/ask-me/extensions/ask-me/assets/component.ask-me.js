if (!customElements.get("ui-ask-me")) {
  class AskMe extends HTMLElement {
    connectedCallback() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.collect(), { once: true });
      } else {
        this.collect();
      }

      document.addEventListener("youcan:section:load", () => this.collect());
      document.addEventListener("youcan:section:unload", (event) => this.collect(event.target));

      this.querySelector('[ui-ask-me="panel"]')?.addEventListener("toggle", (event) => {
        if (event.newState !== "open") return;

        this.setAttribute("data-resetting", "");

        for (const question of this.querySelectorAll('[ui-ask-me="list"] > [ui-ask-me="question"]')) question.open = false;

        requestAnimationFrame(() =>
          requestAnimationFrame(() => this.removeAttribute("data-resetting"))
        );
      });
    }

    collect(removed) {
      const list = this.querySelector('[ui-ask-me="list"]');
      if (!list) return;

      list.replaceChildren(
        ...[...document.querySelectorAll('[ui-ask-me="question-source"] [ui-ask-me="question"]')]
          .filter((question) => !removed?.contains(question))
          .map((question) => question.cloneNode(true))
      );

      const total = list.children.length;

      this.setAttribute("data-count", total);
      list.toggleAttribute("hidden", total === 0);
      this.querySelector('[ui-ask-me="empty"]')?.toggleAttribute("hidden", total > 0);
    }
  }

  customElements.define("ui-ask-me", AskMe);
}
