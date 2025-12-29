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

const style = document.createElement("style");
style.textContent = `
.wiki-preview-card {
  position: fixed;
  left: 0;
  top: 0;
  width: ${CARD_WIDTH}px;
  background: #fff;
  color: #111;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity ${ANIMATION_MS}ms ease, transform ${ANIMATION_MS}ms ease;
  pointer-events: none;
  z-index: 9999;
}

.wiki-preview-card.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.wiki-preview-card img {
  width: 100%;
  height: auto;
  display: block;
}

.wiki-preview-body {
  padding: 14px 16px 16px;
  font-family: "Times New Roman", Times, serif;
}

.wiki-preview-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 6px;
}

.wiki-preview-extract {
  font-size: 0.95rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wiki-preview-extract.is-loading {
  color: #444;
}
`;

document.head.appendChild(style);

const card = document.createElement("div");
card.className = "wiki-preview-card";
card.setAttribute("role", "link");
card.tabIndex = 0;

const image = document.createElement("img");
image.className = "wiki-preview-image";
image.alt = "";
image.hidden = true;

const body = document.createElement("div");
body.className = "wiki-preview-body";

const titleEl = document.createElement("div");
titleEl.className = "wiki-preview-title";

const extractEl = document.createElement("div");
extractEl.className = "wiki-preview-extract";

body.appendChild(titleEl);
body.appendChild(extractEl);

card.appendChild(image);
card.appendChild(body);

document.body.appendChild(card);

function setLoadingState() {
  titleEl.textContent = ARTICLE_TITLE;
  extractEl.textContent = "Loading...";
  extractEl.classList.add("is-loading");
  image.hidden = true;
  image.src = "";
}

function setData(data) {
  titleEl.textContent = data.title || ARTICLE_TITLE;
  extractEl.textContent = data.extract || "";
  extractEl.classList.remove("is-loading");

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

function showCard(event) {
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  if (!isVisible) {
    isVisible = true;
    card.classList.remove("is-visible");
  }

  positionCard();
  // Force a layout so the fade-in transition applies reliably.
  card.getBoundingClientRect();
  if (isVisible) {
    requestAnimationFrame(() => {
      if (isVisible) {
        card.classList.add("is-visible");
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
      extractEl.classList.remove("is-loading");
    });
}

function hideCard() {
  isVisible = false;
  card.classList.remove("is-visible");

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
