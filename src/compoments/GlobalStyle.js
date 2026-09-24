const { createGlobalStyle } = require("styled-components");

export const GlobalStyle = createGlobalStyle`

body, #root {
  background-color: var(--color-bg);
  min-height: 100vh;
}

#root {
  display: flex;
  flex-direction: column;
}

body {
  padding-bottom: var(--space-2xl);
  overflow-x: clip;
}

.wrapper {
  width: min(1120px, 92%);
  margin-inline: auto;
}

a {
  text-decoration: none;
  color: inherit;
}

li {
  list-style: none;
}

.navbar-text.hidden {
  display: none;
}

`
