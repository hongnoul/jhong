const ARTICLE_TITLE = "raspberry";
const CARD_WIDTH = 320;
const ANIMATION_MS = 150;
const CARD_OFFSET = 16;

const EDGE_PADDING = 12;

let cachedData = null;
let fetchPromise = null;
let fetchController = null;
let articleUrl = null;

let lastMouseX = 0;
let lastMouseY = 0;
let isVisible = false;

const hiddenClasses = ["opacity-0", "translate-y-1.5", "pointer-events-none"];
const visibleClasses = ["opacity-100", "translate-y-0", "pointer-events-auto"];

const card = document.createElement("div");
card.className = [
  "fixed",
  "left-0",
  "top-0",
  "z-[9999]",
  "w-[320px]",
  "overflow-hidden",
  "rounded-xl",
  "bg-white",
  "text-neutral-900",
  "shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
  "transition",
  "duration-[150ms]",
  "ease-in-out",
  ...hiddenClasses,
].join(" ");
card.setAttribute("role", "link");
card.tabIndex = 0;

const image = document.createElement("img");
image.className = "block h-auto w-full";
image.alt = "";
image.hidden = true;

const body = document.createElement("div");
body.className = "p-[14px_16px_16px] font-[\"Times New Roman\"]";

const titleEl = document.createElement("div");
titleEl.className = "mb-1.5 text-[1.1rem] font-bold";

const extractEl = document.createElement("div");
extractEl.className = "text-[0.95rem] leading-[1.35] line-clamp-3";

body.appendChild(titleEl);
body.appendChild(extractEl);

card.appendChild(image);
card.appendChild(body);

document.body.appendChild(card);

function setLoadingState() {
  titleEl.textContent = ARTICLE_TITLE;
  extractEl.textContent = "Loading...";
  extractEl.classList.add("text-neutral-600");
  image.hidden = true;
  image.src = "";
}

function setData(data) {
  titleEl.textContent = data.title || ARTICLE_TITLE;
  extractEl.textContent = data.extract || "";
  extractEl.classList.remove("text-neutral-600");

  if (data.thumbnail) {
    image.src = data.thumbnail;
    image.hidden = false;
  } else {
    image.hidden = true;
    image.src = "";
  }

  articleUrl = data.url || null;
}

function fetchSummary() {
  if (cachedData) {
    return Promise.resolve(cachedData);
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchController = new AbortController();
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    ARTICLE_TITLE
  )}`;

  fetchPromise = fetch(endpoint, { signal: fetchController.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Wikipedia request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      cachedData = {
        title: data.title,
        extract: data.extract,
        thumbnail: data.thumbnail && data.thumbnail.source ? data.thumbnail.source : null,
        url:
          data.content_urls &&
          data.content_urls.desktop &&
          data.content_urls.desktop.page
            ? data.content_urls.desktop.page
            : null,
      };
      return cachedData;
    })
    .finally(() => {
      fetchPromise = null;
      fetchController = null;
    });

  return fetchPromise;
}

function positionCard(x = lastMouseX, y = lastMouseY) {
  const rect = card.getBoundingClientRect();
  const width = CARD_WIDTH;
  const height = rect.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let nextX = x + CARD_OFFSET;
  let nextY = y + CARD_OFFSET;

  if (nextX + width + EDGE_PADDING > viewportWidth) {
    nextX = viewportWidth - width - EDGE_PADDING;
  }

  if (nextY + height + EDGE_PADDING > viewportHeight) {
    nextY = viewportHeight - height - EDGE_PADDING;
  }

  if (nextX < EDGE_PADDING) {
    nextX = EDGE_PADDING;
  }

  if (nextY < EDGE_PADDING) {
    nextY = EDGE_PADDING;
  }

  card.style.left = `${nextX}px`;
  card.style.top = `${nextY}px`;
}

function setVisible(nextVisible) {
  if (nextVisible) {
    card.classList.remove(...hiddenClasses);
    card.classList.add(...visibleClasses);
  } else {
    card.classList.remove(...visibleClasses);
    card.classList.add(...hiddenClasses);
  }
}

function showCard(event) {
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  if (!isVisible) {
    isVisible = true;
    setVisible(false);
  }

  positionCard();
  // Force a layout so the fade-in transition applies reliably.
  card.getBoundingClientRect();
  if (isVisible) {
    requestAnimationFrame(() => {
      if (isVisible) {
        setVisible(true);
      }
    });
  }

  if (cachedData) {
    setData(cachedData);
    positionCard();
    return;
  }

  setLoadingState();

  fetchSummary()
    .then((data) => {
      if (!data) {
        return;
      }
      setData(data);
      if (isVisible) {
        positionCard();
      }
    })
    .catch((error) => {
      if (error && error.name === "AbortError") {
        return;
      }
      extractEl.textContent = "Preview unavailable.";
      extractEl.classList.remove("text-neutral-600");
    });
}

function hideCard() {
  isVisible = false;
  setVisible(false);

  if (fetchController) {
    fetchController.abort();
  }
}

function handleCardClick() {
  if (!articleUrl) {
    return;
  }
  window.open(articleUrl, "_blank", "noopener");
}

const heroHeadings = document.querySelectorAll(".hero h1");
heroHeadings.forEach((heading) => {
  heading.addEventListener("pointerenter", showCard);
  heading.addEventListener("pointerleave", hideCard);
});
card.addEventListener("click", handleCardClick);
card.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleCardClick();
  }
});

document.addEventListener("mousemove", (event) => {
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  if (isVisible) {
    positionCard();
  }
});

window.addEventListener("resize", () => {
  if (isVisible) {
    positionCard();
  }
});
