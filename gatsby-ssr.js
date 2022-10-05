import * as React from "react"

export const onRenderBody = ({ setHeadComponents }) => {
  setHeadComponents([
    <link
      rel="preload"
      href="./static/fonts/ClashDisplay-Variable.ttf"
      as="font"
      type="font/truetype"
      crossOrigin="anonymous"
      key="ClashDisplay-Variable"
    />,
  ])
}