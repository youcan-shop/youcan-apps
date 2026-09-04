if (!customElements.get("ui-ask-me")) {
  class AskMe extends HTMLElement {
    connectedCallback() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.collect(), { once: true });
      } else {
        this.collect();
      }
    }

    collect() {
      const list = this.querySelector('[ui-ask-me="list"]');
      if (!list) return;

      list.append(
        ...document.querySelectorAll('[ui-ask-me="question-source"] [ui-ask-me="question"]')
      );

      const total = list.children.length;

      this.setAttribute("data-count", total);
      list.toggleAttribute("hidden", total === 0);
      this.querySelector('[ui-ask-me="empty"]')?.toggleAttribute("hidden", total > 0);

      this.querySelector('[ui-ask-me="panel"]')?.addEventListener("toggle", (event) => {
        if (event.newState !== "closed") return;

        for (const question of list.children) question.open = false;
      });
    }
  }

  customElements.define("ui-ask-me", AskMe);
}
