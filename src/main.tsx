import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Root } from './Root.js'
import { Url } from './Url.js'
import indexCss from "./index.css?inline"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <style dangerouslySetInnerHTML={{ __html: indexCss }} />
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root/>}/>
        <Route path="/:url" element={<Url/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
