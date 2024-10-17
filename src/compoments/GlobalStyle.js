import backgroundImg from "../assets/images/background.jpg"
const { createGlobalStyle } = require("styled-components");

export const GlobalStyle =createGlobalStyle`

body,#root {
  background-image: url(${backgroundImg});
  background-size: cover;
  background-repeat: no-repeat;
  backdrop-filter: blur(5px);
}

#root {
  min-height: 100vh;
}

body {
  padding-bottom: 50px;
}

.wrapper {
  width: 90%;
  margin: auto;
}

a {
  text-decoration: none!important;
  color: #fff!important;
}

img {
  width: 200px;
  height: 200px;
}

.navbar-text.hidden {
  display: none;
}

li {
  list-style: none;
}

`