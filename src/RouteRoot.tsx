import { AutomergeUrl, isValidAutomergeUrl } from '@automerge/automerge-repo';
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const style = `
  body {
    margin: 80px;
  }

  .bg-green-100 {
    --tw-bg-opacity: 1;
    background-color: rgb(220 252 231 / var(--tw-bg-opacity))
  }

  .bg-red-100 {
    --tw-bg-opacity: 1;
    background-color: rgb(254 226 226 / var(--tw-bg-opacity))
  }
`

export const RouteRoot = memo(() => {
  const navigate = useNavigate();

  return <>
    <style>{style}</style>
    <h1>lp-viewer</h1>
    <AutomergeUrlSelector onSelect={(url) => {
      navigate(`./${url}`)
    }}/>
  </>;
});

const AutomergeUrlSelector = memo((props: {
  onSelect: (url: AutomergeUrl) => void,
}) => {
  const { onSelect } = props;

  const [openUrlInput, setOpenUrlInput] = useState("");
  const automergeUrlMatch =
    openUrlInput
    .replace(/%3A/g, ':')
    .match(/(automerge:[a-zA-Z0-9]*)/);
  const automergeUrlToOpen =
    automergeUrlMatch &&
    automergeUrlMatch[1] &&
    isValidAutomergeUrl(automergeUrlMatch[1])
      ? automergeUrlMatch[1]
      : null;

  return <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "fit-content",
    }}
  >
    <input
      style={{ width: 350 }}
      value={openUrlInput}
      placeholder="automerge:<url>"
      onChange={(e) => setOpenUrlInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && automergeUrlToOpen) {
          setOpenUrlInput("");
          onSelect(automergeUrlToOpen);
        }
      }}
      className={`outline-none ${
        automergeUrlToOpen
          ? "bg-green-100"
          : openUrlInput.length > 0
          ? "bg-red-100"
          : ""
      }`}
    />
    <div style={{ textAlign: 'right' }}>
      {automergeUrlToOpen && <> {"\u23CE"} Enter to open </>}
      {openUrlInput.length > 0 &&
        !automergeUrlToOpen &&
        "Not a valid Automerge URL"}
    </div>
  </div>;
});
