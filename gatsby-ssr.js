import * as React from "react"

export const onRenderBody = ({ setHeadComponents }) => {
  setHeadComponents([
    <link
      rel="preload"
      href="./fonts/ClashDisplay-Variable.ttf"
      as="font"
      type="font/ttf"
      crossOrigin="anonymous"
      key="ClashDisplay-Variable"
    />,
  ])
}