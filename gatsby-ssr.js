import * as React from "react"
const HeadComponents = [
  <link
      rel="preload"
      href="./fonts/ClashDisplay-Variable.ttf"
      as="font"
      type="font/ttf"
      crossOrigin="anonymous"
      key="ClashDisplay-Variable"
    />
];

const HtmlAttributes = {lang: 'en-GB'};

export const onRenderBody = ({ setHeadComponents, setHtmlAttributes }) => {
  setHeadComponents(HeadComponents)
  setHtmlAttributes(HtmlAttributes)
}
